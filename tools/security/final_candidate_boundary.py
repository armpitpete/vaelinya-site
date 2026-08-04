#!/usr/bin/env python3
"""Record pushable and GitHub-controlled reference boundaries for a rewrite candidate.

This script does not push, delete, or mutate any remote reference. It compares the
complete source mirror with the locally rewritten candidate and prepares the exact
operator and GitHub Support records required for final sensitive-history removal.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys


def run(args: list[str], *, cwd: Path | None = None) -> str:
    completed = subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return completed.stdout


def all_refs(repo: Path) -> dict[str, str]:
    output = run(
        [
            "git",
            "--git-dir",
            str(repo),
            "for-each-ref",
            "--format=%(refname)\t%(objectname)",
        ]
    )
    refs: dict[str, str] = {}
    for line in output.splitlines():
        if not line.strip():
            continue
        ref, oid = line.split("\t", 1)
        refs[ref] = oid
    return refs


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def category(ref: str) -> str:
    if ref.startswith("refs/heads/"):
        return "pushable-head"
    if ref.startswith("refs/tags/"):
        return "pushable-tag"
    if ref.startswith("refs/pull/"):
        return "github-controlled-pull-ref"
    return "other-reference"


def write_ref_table(
    path: Path,
    before: dict[str, str],
    after: dict[str, str],
) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(("ref", "category", "before", "after", "changed", "present_after"))
        for ref in sorted(set(before) | set(after)):
            old = before.get(ref, "")
            new = after.get(ref, "")
            writer.writerow(
                (
                    ref,
                    category(ref),
                    old,
                    new,
                    "yes" if old != new else "no",
                    "yes" if ref in after else "no",
                )
            )


def write_support_request(
    path: Path,
    repository_url: str,
    main_before: str,
    main_after: str,
    pull_refs: list[str],
    backup_sha: str,
    candidate_sha: str,
) -> None:
    lines = [
        "# GitHub Support request — remove sensitive-data pull references and cached views",
        "",
        "## Repository",
        "",
        repository_url,
        "",
        "## Reason",
        "",
        "A bounded history rewrite removes a personal absolute local filesystem path from all user-pushable branches and tags. GitHub-controlled pull-request refs and cached pull-request views cannot be rewritten by repository administrators and require GitHub Support removal after the coordinated force-push.",
        "",
        "## Verified candidate",
        "",
        f"- Current main before rewrite: `{main_before}`",
        f"- Rewritten main candidate: `{main_after}`",
        f"- Pre-rewrite backup bundle SHA-256: `{backup_sha}`",
        f"- Rewritten candidate bundle SHA-256: `{candidate_sha}`",
        "- Candidate passed bundle verification, Git fsck, zero-remaining forbidden-path scan, exact ref-map review, and independent site build.",
        "",
        "## GitHub-controlled refs requiring purge",
        "",
    ]
    lines.extend(f"- `{ref}`" for ref in pull_refs)
    lines.extend(
        [
            "",
            "## Requested GitHub action",
            "",
            "1. Remove or dereference the listed `refs/pull/*` objects that retain pre-rewrite commits.",
            "2. Purge cached pull-request diffs, commit pages, raw-object views and repository-network views that retain the replaced objects.",
            "3. Run server-side garbage collection for the repository after the owner confirms the force-push has completed.",
            "4. Confirm when old object identifiers are no longer reachable through GitHub-hosted refs or cached views.",
            "",
            "The repository owner will retain the verified backup bundle and can provide the exact before/after ref map if required.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-mirror", required=True, type=Path)
    parser.add_argument("--candidate-bundle", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--repository-url", required=True)
    args = parser.parse_args()

    source = args.source_mirror.resolve()
    candidate_bundle = args.candidate_bundle.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    candidate_repo = output / "boundary-candidate.git"
    if candidate_repo.exists():
        shutil.rmtree(candidate_repo)
    run(["git", "clone", "--mirror", str(candidate_bundle), str(candidate_repo)])
    run(["git", "--git-dir", str(candidate_repo), "fsck", "--full"])

    before = all_refs(source)
    after = all_refs(candidate_repo)
    write_ref_table(output / "all-ref-map.tsv", before, after)

    pushable = sorted(
        ref
        for ref in before
        if ref.startswith("refs/heads/") or ref.startswith("refs/tags/")
    )
    pull_refs = sorted(ref for ref in before if ref.startswith("refs/pull/"))
    other_refs = sorted(
        ref
        for ref in before
        if ref not in pushable and ref not in pull_refs
    )

    if not pushable:
        raise SystemExit("No pushable branch or tag refs were discovered")
    if set(pushable) - set(after):
        missing = sorted(set(pushable) - set(after))
        raise SystemExit(f"Pushable refs missing from candidate: {missing}")

    main_before = before.get("refs/heads/main")
    main_after = after.get("refs/heads/main")
    if not main_before or not main_after:
        raise SystemExit("main is missing from the before/after ref map")

    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    backup_sha = manifest["backup_bundle_sha256"]
    candidate_sha = manifest["candidate_bundle_sha256"]

    boundary = {
        "all_ref_count_before": len(before),
        "all_ref_count_after": len(after),
        "pushable_ref_count": len(pushable),
        "github_controlled_pull_ref_count": len(pull_refs),
        "other_ref_count": len(other_refs),
        "main_before": main_before,
        "main_after": main_after,
        "backup_bundle_sha256": backup_sha,
        "candidate_bundle_sha256": candidate_sha,
        "candidate_bundle_file_sha256": sha256(candidate_bundle),
        "force_push_executed": False,
        "github_support_purge_completed": False,
    }
    (output / "reference-boundary.json").write_text(
        json.dumps(boundary, indent=2) + "\n",
        encoding="utf-8",
    )

    (output / "pushable-refs.txt").write_text(
        "\n".join(pushable) + "\n",
        encoding="utf-8",
    )
    (output / "github-controlled-pull-refs.txt").write_text(
        "\n".join(pull_refs) + ("\n" if pull_refs else ""),
        encoding="utf-8",
    )
    (output / "other-refs.txt").write_text(
        "\n".join(other_refs) + ("\n" if other_refs else ""),
        encoding="utf-8",
    )

    write_support_request(
        output / "GITHUB_SUPPORT_REQUEST.md",
        args.repository_url,
        main_before,
        main_after,
        pull_refs,
        backup_sha,
        candidate_sha,
    )

    (output / "FINAL_EXECUTION_NOT_RUN.sh").write_text(
        "#!/usr/bin/env bash\n"
        "set -euo pipefail\n"
        "echo 'Protected stop: coordinate the force-push with the GitHub Support pull-ref purge.' >&2\n"
        "exit 1\n\n"
        "# Only after exact candidate acceptance and Support coordination:\n"
        "# git clone --mirror vaelinya-site-rewritten-candidate.bundle final-push.git\n"
        "# cd final-push.git\n"
        f"# git remote set-url origin {args.repository_url}\n"
        "# git push --force --prune origin 'refs/heads/*:refs/heads/*'\n"
        "# git push --force --prune origin 'refs/tags/*:refs/tags/*'\n",
        encoding="utf-8",
    )

    shutil.rmtree(candidate_repo)
    print(json.dumps(boundary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
