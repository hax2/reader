#!/usr/bin/env python3
"""Build library.json for GitHub Pages from audio files in the repo."""

from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path

AUDIO_EXTENSIONS = {".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav", ".webm"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Create library.json from hosted audio files.")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("-o", "--output", type=Path, default=Path("library.json"))
    args = parser.parse_args()

    root = args.root.resolve()
    tracks = []
    for audio in sorted(root.iterdir(), key=lambda path: path.name.lower()):
        if not audio.is_file() or audio.suffix.lower() not in AUDIO_EXTENSIONS:
            continue
        transcript = audio.with_suffix(".json")
        item = {
            "title": title_from_stem(audio.stem),
            "audio": audio.name,
            "glossary": "glossary/shared.json",
        }
        if transcript.exists():
            item["transcript"] = transcript.name
        tracks.append(item)

    args.output.write_text(
        json.dumps(tracks, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(tracks)} tracks to {args.output}")


def title_from_stem(stem: str) -> str:
    normalized = unicodedata.normalize("NFKC", stem).replace("_", " ").replace("-", " ")
    return " ".join(normalized.split()).strip().capitalize()


if __name__ == "__main__":
    main()
