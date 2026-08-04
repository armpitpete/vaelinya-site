#!/usr/bin/env python3
"""Build and verify a non-pushed Git history remediation candidate.

The script inventories reachable blobs, creates a complete backup bundle, rewrites
only blobs containing bounded local absolute filesystem paths, verifies the
candidate, and emits checksums and an exact ref map. It never contacts or updates
a remote.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

# Construct the confirmed private root without republishing it as a searchable
# literal in the remediation source itself.
KNOWN_ROOT = bytes(
    (
        73, 58, 92, 79, 82, 68, 69, 82, 92, 77, 97, 105, 110, 86, 97,
        117, 108, 116, 92, 86, 65, 69, 76, 73, 78, 89, 65,
    )
)
KNOWN_PARENT = bytes((73, 58, 92, 79, 82, 68, 69, 82))
TEXT_REPLACEMENT = b"<LOCAL_VAELINYA_ROOT>"


def build_patterns() -> tuple[tuple[str, re.Pattern[bytes]], ...]:
    separator = rb"\\"
    segment = rb"[^\\\x00\r\n\t\"'<>|?*]+"
    workspace_names = b"(?:" + b"|".join(
        (b"ORDER", b"MainVault", b"Documents", b"Downloads", b"Desktop", b"OneDrive")
    ) + b")"

    return (
        (
            "known-vaelinya-root",
            re.compile(
                re.escape(KNOWN_ROOT) + rb"(?:" + separator + segment + rb")*",
                re.IGNORECASE,
            ),
        ),
        (
            "windows-user-path",
            re.compile(
                rb"[A-Za-z]:" + separator + b"Users" + separator + segment
                + rb"(?:" + separator + segment + rb")+",
                re.IGNORECASE,
            ),
        ),
        (
            "windows-workspace-path",
            re.compile(
                rb"[A-Za-z]:" + separator + workspace_names
                + rb"(?:" + separator + segment + rb")+",
                re.IGNORECASE,
            ),
        ),
        (
            "posix-home-path",
            re.compile(
                rb"(?<![A-Za-z0-9_./-])/(?:home|Users)/"
                rb"[^/\x00\r\n\t\"'<>]+(?:/[^/\x00\r\n\t\"'<>]+)+"
            ),
        ),
        (
            "file-uri",
            re.compile(
                rb"file:///(?:[A-Za-z]:/|(?:home|Users)/)"
                rb"[^\x00\r\n\t\"'<>]+",
                re.IGNORECASE,
            ),
        ),
    )


ASCII_PATTERNS = build_patterns()
KNOWN_UTF16LE = (
    KNOWN_ROOT.decode("ascii").encode("utf-16le"),
    KNOWN_PARENT.decode("ascii").encode("utf-16le"),
)


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


def tree_oid(repo: Path, ref: str) -> str:
    return run(
        ["git", "--git-dir", str(repo), "rev-parse", f"{ref}^{{tree}}"]
    ).strip()


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


def disposition(paths: set[str]) -> str:
    if any(path.startswith("tools/security/") for path in paths):
        return "historical-security-signature-copy"
    if any(path in {"VAELINYA_CANON_INDEX.md", "VAELINYA_LOCAL_IMPORT_PLAN.md"} for path in paths):
        return "confirmed-public-local-path"
    return "candidate-local-path-requiring-review"


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
                "disposition": disposition(paths),
                "size": len(data),
                "patterns": ",".join(patterns),
                "paths": " | ".join(sorted(paths)),
            }
        )

    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=("oid", "classification", "disposition", "size", "patterns", "paths"),
            delimiter="\t",
        )
        writer.writeheader()
        writer.writerows(records)
    return records


def write_refs(path: Path, values: dict[str, str]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for ref, oid in sorted(values.items()):
            handle.write(f"{ref}\t{oid}\n")


def callback_source() -> str:
    compiled = "\n".join(
        f"    re.compile({pattern.pattern!r}, {pattern.flags}),"
        for _, pattern in ASCII_PATTERNS
    )
    encoded_values = repr(list(KNOWN_UTF16LE))
    replacement = repr(TEXT_REPLACEMENT)
    return f"""
import re
patterns = [
{compiled}
]
known_utf16 = {encoded_values}
text_replacement = {replacement}
data = blob.data
binary = b"\\x00" in data[:8192]
if binary:
    for pattern in patterns:
        data = pattern.sub(lambda match: b"X" * len(match.group(0)), data)
    for value in known_utf16:
        masked = (b"X\\x00" * (len(value) // 2 + 1))[:len(value)]
        data = re.sub(re.escape(value), masked, data, flags=re.IGNORECASE)
else:
    for pattern in patterns:
        data = pattern.sub(text_replacement, data)
    for value in known_utf16:
        data = re.sub(
            re.escape(value),
            text_replacement.decode("ascii").encode("utf-16le"),
            data,
            flags=re.IGNORECASE,
        )
blob.data = data
"""


def rewrite(repo: Path) -> None:
    run(
        [
            "git",
            "-C",
            str(repo),
            "filter-repo",
            "--force",
            "--blob-callback",
            callback_source(),
        ],
        capture=False,
    )


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

    before_tree_oid = tree_oid(source, "refs/heads/main")

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

    after_tree_oid = tree_oid(candidate_repo, "refs/heads/main")
    main_tree_preserved = before_tree_oid == after_tree_oid
    if not main_tree_preserved:
        raise SystemExit(
            "Current main tree changed during the history rewrite: "
            f"before={before_tree_oid}, after={after_tree_oid}"
        )

    candidate_bundle = out / "vaelinya-site-rewritten-candidate.bundle"
    run(
        ["git", "--git-dir", str(candidate_repo), "bundle", "create", str(candidate_bundle), "--all"],
        capture=False,
    )
    run(["git", "bundle", "verify", str(candidate_bundle)], capture=False)

    checksums = {
        "backup_bundle_sha256": sha256_file(backup),
        "candidate_bundle_sha256": sha256_file(candidate_bundle),
        "main_tree_before_git_oid": before_tree_oid,
        "main_tree_after_git_oid": after_tree_oid,
        "main_tree_preserved": main_tree_preserved,
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
        "git for-each-ref --format='%(refname) %(objectname)' refs/heads refs/tags\n"
        "```\n\n"
        "The backup must not be deleted without separate owner authority.\n",
        encoding="utf-8",
    )

    print(json.dumps(checksums, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
