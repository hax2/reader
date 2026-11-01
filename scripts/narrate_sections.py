#!/usr/bin/env python3
"""Narrate a collection section by section; optionally commit and push each result."""
from __future__ import annotations

import argparse
import fcntl
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(root: Path, command: list[str]) -> None:
    subprocess.run(command, cwd=root, check=True)


def push_section(root: Path, entry: dict) -> None:
    paths = ["library.json", entry["audio"], entry["transcript"]]
    run(root, ["git", "add", "--", *paths])
    changes = subprocess.run(["git", "diff", "--cached", "--quiet", "--", *paths], cwd=root)
    if changes.returncode not in (0, 1):
        raise RuntimeError("Could not inspect staged narration files")
    if changes.returncode == 1:
        run(root, ["git", "commit", "--only", "-m", f"Add local Italian narration: {entry['title']}", "--", *paths])
    run(root, ["git", "push", "origin", "main"])


def narrate_sections(root: Path, collection: str, push: bool) -> None:
    if push:
        branch = subprocess.check_output(["git", "branch", "--show-current"], cwd=root, text=True).strip()
        if branch != "main":
            raise RuntimeError("Section publishing expects the main branch")
        # Retry an unpushed last section before generating any more on restart.
        run(root, ["git", "push", "origin", "main"])
    catalog = json.loads((root / "library.json").read_text(encoding="utf-8"))
    sections = [entry for entry in catalog if entry.get("collection") == collection]
    if not sections:
        raise ValueError(f"No sections in collection: {collection}")
    for index, entry in enumerate(sections, 1):
        if entry.get("audio"):
            continue
        print(f"Section {index}/{len(sections)}: {entry['title']}", flush=True)
        run(root, [sys.executable, "scripts/local_tts.py", "run", "--only", entry["id"]])
        updated = json.loads((root / "library.json").read_text(encoding="utf-8"))
        completed = next(item for item in updated if item["id"] == entry["id"])
        if not completed.get("audio") or not completed.get("transcript"):
            raise RuntimeError(f"Narration did not publish {entry['id']}")
        if push:
            push_section(root, completed)
        print(f"Completed section {index}/{len(sections)}: {entry['title']}", flush=True)
    print("All sections completed.", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--collection", default="dante-inferno")
    parser.add_argument("--push", action="store_true", help="Commit and push each aligned section to origin/main")
    args = parser.parse_args()
    root = args.root.resolve()
    cache = root / ".tts-cache/local"
    cache.mkdir(parents=True, exist_ok=True)
    with (cache / "sections.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit("A section narration queue is already running")
        narrate_sections(root, args.collection, args.push)


if __name__ == "__main__":
    main()
