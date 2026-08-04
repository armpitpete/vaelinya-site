#!/usr/bin/env python3
"""Build and verify a non-pushed Git history remediation candidate.

The script inventories reachable blobs, creates a complete backup bundle, rewrites
only blobs containing local absolute filesystem paths, verifies the candidate,
and emits checksums and an exact ref map. It never contacts or updates a remote.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Iterable

ASCII_PATTERNS: tuple[tuple[str, re.Pattern[bytes]], ...] = (
    (
        "known-vaelinya-root",
        re.compile(rb"I:\\ORDER\\MainVault\\VAELINYA(?:\\[^\x00\r\n\t\"'<>|?*]*)?", re.IGNORECASE),
    ),
    (
        "windows-user-path",
        re.compile(rb"[A-Za-z]:\\Users\\[^\\\x00\r\n\t\"'<>|?*]+(?:\\[^\x00\r\n\t\"'<>|?*]+)+"),
    ),
    (
        "windows-workspace-path",
        re.compile(rb"[A-Za-z]:\\(?:ORDER|MainVault|Documents|Downloads|Desktop|OneDrive)(?:\\[^\x00\r\n\t\"'<>|?*]+)+", re.IGNORECASE),
    ),
    (
        "posix-home-path",
        re.compile(rb"/(?:home|Users)/[^/\x00\r\n\t\"'<>]+(?:/[^\x00\r\n\t\"'<>]+)+"),
    ),
    (
        "file-uri",
        re.compile(rb"file:///(?:[A-Za-z]:/|(?:home|Users)/)[^\x00\r\n\t\"'<>]+", re.IGNORECASE),
    ),
)

KNOWN_UTF16LE = tuple(
    value.encode("utf-16le")
    for value in (
        r"I:\ORDER\MainVault\VAELINYA",
        r"I:\ORDER",
    )
)

TEXT_REPLACEMENT = b"<LOCAL_VAELINYA_ROOT>"


def run(args: list[str], *, cwd: Path | None = None, capture: bool = True) -> str:
    completed = subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    return completed.stdout if capture else ""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def refs(repo: Path) -> dict[str, str]:
    output = run(
        [
            "git",
            "--git-dir",
            str(repo),
            "for-each-ref",
            "--format=%(refname)\t%(objectname)",
            "refs/heads",
            "refs/tags",
        ]
    )
    result: dict[str, str] = {}
    for line in output.splitlines():
        if not line.strip():
            continue
        ref, oid = line.split("\t", 1)
        result[ref] = oid
    return result


def reachable_blob_paths(repo: Path) -> dict[str, set[str]]:
    output = run(["git", "--git-dir", str(repo), "rev-list", "--objects", "--all"])
    mapping: dict[str, set[str]] = {}
    for line in output.splitlines():
        oid, *rest = line.split(" ", 1)
        try:
            object_type = run(["git", "--git-dir", str(repo), "cat-file", "-t", oid]).strip()
        except subprocess.CalledProcessError:
            continue
        if object_type != "blob":
            continue
        path = rest[0] if rest else "<unmapped>"
        mapping.setdefault(oid, set()).add(path)
    return mapping


def blob_bytes(repo: Path, oid: str) -> bytes:
    completed = subprocess.run(
        ["git", "--git-dir", str(repo), "cat-file", "blob", oid],
        check=True,
        stdout=subprocess.PIPE,
    )
    return completed.stdout


def classify_matches(data: bytes) -> tuple[str, list[str]]:
    found: list[str] = []
    for name, pattern in ASCII_PATTERNS:
        if pattern.search(data):
            found.append(name)
    for value in KNOWN_UTF16LE:
        if value.lower() in data.lower():
            found.append("utf16le-known-path")
            break
    classification = "binary-metadata" if b"\x00" in data[:8192] else "text-content"
    return classification, sorted(set(found))


def inventory(repo: Path, output: Path) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for oid, paths in sorted(reachable_blob_paths(repo).items()):
        data = blob_bytes(repo, oid)
        classification, patterns = classify_matches(data)
        if not patterns:
            continue
        records.append(
            {
                "oid": oid,
                "classification": classification,
                "size": len(data),
                "patterns": ",".join(patterns),
                "paths": " | ".join(sorted(paths)),
            }
        )

    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=("oid", "classification", "size", "patterns", "paths"),
            delimiter="\t",
        )
        writer.writeheader()
        writer.writerows(records)
    return records


def write_refs(path: Path, values: dict[str, str]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for ref, oid in sorted(values.items()):
            handle.write(f"{ref}\t{oid}\n")


def rewrite(repo: Path) -> None:
    callback = r'''
import re
patterns = [
    re.compile(rb"I:\\ORDER\\MainVault\\VAELINYA(?:\\[^\x00\r\n\t\"'<>|?*]*)?", re.IGNORECASE),
    re.compile(rb"[A-Za-z]:\\Users\\[^\\\x00\r\n\t\"'<>|?*]+(?:\\[^\x00\r\n\t\"'<>|?*]+)+"),
    re.compile(rb"[A-Za-z]:\\(?:ORDER|MainVault|Documents|Downloads|Desktop|OneDrive)(?:\\[^\x00\r\n\t\"'<>|?*]+)+", re.IGNORECASE),
    re.compile(rb"/(?:home|Users)/[^/\x00\r\n\t\"'<>]+(?:/[^\x00\r\n\t\"'<>]+)+"),
    re.compile(rb"file:///(?:[A-Za-z]:/|(?:home|Users)/)[^\x00\r\n\t\"'<>]+", re.IGNORECASE),
]
known_utf16 = [
    r"I:\ORDER\MainVault\VAELINYA".encode("utf-16le"),
    r"I:\ORDER".encode("utf-16le"),
]
data = blob.data
binary = b"\x00" in data[:8192]
if binary:
    for pattern in patterns:
        data = pattern.sub(lambda match: b"X" * len(match.group(0)), data)
    for value in known_utf16:
        replacement = (b"X\x00" * (len(value) // 2))[:len(value)]
        data = re.sub(re.escape(value), replacement, data, flags=re.IGNORECASE)
else:
    for pattern in patterns:
        data = pattern.sub(b"<LOCAL_VAELINYA_ROOT>", data)
    for value in known_utf16:
        replacement = "<LOCAL_VAELINYA_ROOT>".encode("utf-16le")
        data = re.sub(re.escape(value), replacement, data, flags=re.IGNORECASE)
blob.data = data
'''
    run(
        [
            "git",
            "-C",
            str(repo),
            "filter-repo",
            "--force",
            "--blob-callback",
            callback,
        ],
        capture=False,
    )


def archive_digest(repo: Path, ref: str, destination: Path) -> str:
    with destination.open("wb") as handle:
        subprocess.run(
            ["git", "--git-dir", str(repo), "archive", "--format=tar", ref],
            check=True,
            stdout=handle,
        )
    return sha256_file(destination)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mirror", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--repository-url", required=True)
    args = parser.parse_args()

    source = args.mirror.resolve()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)

    if not (source / "HEAD").exists():
        raise SystemExit(f"Not a mirror repository: {source}")

    run(["git", "--git-dir", str(source), "fsck", "--full"], capture=False)

    pre_refs = refs(source)
    write_refs(out / "pre-refs.tsv", pre_refs)
    affected = inventory(source, out / "affected-blobs.tsv")

    backup = out / "vaelinya-site-pre-rewrite.bundle"
    run(["git", "--git-dir", str(source), "bundle", "create", str(backup), "--all"], capture=False)
    run(["git", "bundle", "verify", str(backup)], capture=False)

    before_tar = out / "main-before.tar"
    before_tree_digest = archive_digest(source, "refs/heads/main", before_tar)

    candidate_repo = out / "candidate.git"
    shutil.copytree(source, candidate_repo, symlinks=True)
    rewrite(candidate_repo)
    run(["git", "--git-dir", str(candidate_repo), "fsck", "--full"], capture=False)

    post_refs = refs(candidate_repo)
    write_refs(out / "post-refs.tsv", post_refs)
    if set(pre_refs) != set(post_refs):
        missing = sorted(set(pre_refs) - set(post_refs))
        added = sorted(set(post_refs) - set(pre_refs))
        raise SystemExit(f"Ref set changed. Missing={missing}; added={added}")

    with (out / "ref-map.tsv").open("w", encoding="utf-8") as handle:
        handle.write("ref\tbefore\tafter\tchanged\n")
        for ref in sorted(pre_refs):
            handle.write(
                f"{ref}\t{pre_refs[ref]}\t{post_refs[ref]}\t"
                f"{'yes' if pre_refs[ref] != post_refs[ref] else 'no'}\n"
            )

    remaining = inventory(candidate_repo, out / "remaining-forbidden-blobs.tsv")
    if remaining:
        raise SystemExit(f"Forbidden paths remain in {len(remaining)} reachable blobs")

    after_tar = out / "main-after.tar"
    after_tree_digest = archive_digest(candidate_repo, "refs/heads/main", after_tar)

    candidate_bundle = out / "vaelinya-site-rewritten-candidate.bundle"
    run(
        ["git", "--git-dir", str(candidate_repo), "bundle", "create", str(candidate_bundle), "--all"],
        capture=False,
    )
    run(["git", "bundle", "verify", str(candidate_bundle)], capture=False)

    checksums = {
        "backup_bundle_sha256": sha256_file(backup),
        "candidate_bundle_sha256": sha256_file(candidate_bundle),
        "main_tree_before_sha256": before_tree_digest,
        "main_tree_after_sha256": after_tree_digest,
        "affected_blob_count": len(affected),
        "ref_count": len(pre_refs),
        "repository_url": args.repository_url,
    }
    (out / "manifest.json").write_text(json.dumps(checksums, indent=2) + "\n", encoding="utf-8")

    (out / "RESTORE.md").write_text(
        "# Restoration\n\n"
        "The pre-rewrite bundle is the authoritative rollback source.\n\n"
        "```bash\n"
        "git clone --mirror vaelinya-site-pre-rewrite.bundle restore.git\n"
        "cd restore.git\n"
        f"git remote set-url origin {args.repository_url}\n"
        "git fsck --full\n"
        "# Review refs before any push.\n"
        "git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/tags\n"
        "```\n\n"
        "The backup must not be deleted without separate owner authority.\n",
        encoding="utf-8",
    )

    (out / "FORCE_PUSH_NOT_EXECUTED.sh").write_text(
        "#!/usr/bin/env bash\n"
        "set -euo pipefail\n"
        "echo 'Protected action: review the manifest, ref map and independent verification first.' >&2\n"
        "exit 1\n\n"
        "# After explicit protected-gate acceptance, replace the exit above with:\n"
        "# git clone --mirror vaelinya-site-rewritten-candidate.bundle candidate-push.git\n"
        "# cd candidate-push.git\n"
        f"# git remote set-url origin {args.repository_url}\n"
        "# git push --force origin 'refs/heads/*:refs/heads/*'\n"
        "# git push --force origin 'refs/tags/*:refs/tags/*'\n",
        encoding="utf-8",
    )

    print(json.dumps(checksums, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
