#!/usr/bin/env python3
"""Run git-filter-repo in official sensitive-data mode and preserve its report.

This is a reporting pass over a disposable mirror. It never updates remote refs.
The resulting branch/tag refs must exactly match the primary rewritten candidate.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys


def run(args: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def load_remediation(path: Path):
    spec = importlib.util.spec_from_file_location("history_remediation", path)
    if spec is None or spec.loader is None:
        raise SystemExit(f"Unable to load remediation module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def object_type(repo: Path, oid: str) -> str | None:
    completed = subprocess.run(
        ["git", "--git-dir", str(repo), "cat-file", "-t", oid],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    return completed.stdout.strip() if completed.returncode == 0 else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-mirror", required=True, type=Path)
    parser.add_argument("--expected-candidate-bundle", required=True, type=Path)
    parser.add_argument("--remediation-module", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    source = args.source_mirror.resolve()
    expected_bundle = args.expected_candidate_bundle.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    remediation = load_remediation(args.remediation_module.resolve())

    report_repo = output / "sensitive-report.git"
    expected_repo = output / "expected-candidate.git"
    for path in (report_repo, expected_repo):
        if path.exists():
            shutil.rmtree(path)

    shutil.copytree(source, report_repo, symlinks=True)
    completed = run(
        [
            "git",
            "-C",
            str(report_repo),
            "filter-repo",
            "--force",
            "--sensitive-data-removal",
            "--blob-callback",
            remediation.callback_source(),
        ]
    )
    (output / "git-filter-repo-sensitive-output.txt").write_text(
        completed.stdout,
        encoding="utf-8",
    )

    filter_dir = report_repo / "filter-repo"
    first_source = filter_dir / "first-changed-commits"
    if not first_source.is_file():
        raise SystemExit("git-filter-repo did not produce first-changed-commits")

    first_changed = [
        line.strip()
        for line in first_source.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if not first_changed:
        raise SystemExit("git-filter-repo reported no first changed commits")

    (output / "first-changed-commits.txt").write_text(
        "\n".join(first_changed) + "\n",
        encoding="utf-8",
    )

    orphaned_source = filter_dir / "orphaned_lfs_objects"
    orphaned_lfs: list[str] = []
    if orphaned_source.is_file():
        orphaned_lfs = [
            line.strip()
            for line in orphaned_source.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        shutil.copy2(orphaned_source, output / "orphaned-lfs-objects.txt")

    run(["git", "clone", "--mirror", str(expected_bundle), str(expected_repo)])
    report_refs = remediation.refs(report_repo)
    expected_refs = remediation.refs(expected_repo)
    if report_refs != expected_refs:
        raise SystemExit("Sensitive-data reporting pass differs from primary candidate refs")

    locations = []
    for oid in first_changed:
        locations.append(
            {
                "oid": oid,
                "source_object_type": object_type(source, oid),
                "candidate_object_type": object_type(report_repo, oid),
            }
        )

    report = {
        "first_changed_commits": first_changed,
        "first_changed_commit_count": len(first_changed),
        "orphaned_lfs_objects": orphaned_lfs,
        "orphaned_lfs_object_count": len(orphaned_lfs),
        "reported_hash_locations": locations,
        "candidate_refs_match_primary": True,
        "remote_refs_changed": False,
    }
    (output / "sensitive-removal-report.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )

    shutil.rmtree(report_repo)
    shutil.rmtree(expected_repo)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
