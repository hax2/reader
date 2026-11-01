#!/usr/bin/env python3
"""Split the original Italian Inferno into 34 independently narrated cantos."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def import_cantos(root: Path) -> None:
    source = (root / "texts/dante_inferno.txt").read_text(encoding="utf-8")
    headings = list(re.finditer(r"^Canto ([IVXL]+)$", source, re.M))
    if len(headings) != 34 or headings[-1][1] != "XXXIV":
        raise ValueError("Expected all 34 Italian cantos")
    path = root / "library.json"
    library = json.loads(path.read_text(encoding="utf-8"))
    existing = {entry["id"]: entry for entry in library}
    template = existing.get("dante-inferno") or existing.get("dante-inferno-c01")
    if not template:
        raise ValueError("Missing Inferno catalog metadata")
    sections = []
    for index, heading in enumerate(headings):
        number = index + 1
        identifier = f"dante-inferno-c{number:02}"
        title = f"Inferno {number:02}: Canto {heading[1]}"
        end = headings[index + 1].start() if index + 1 < len(headings) else len(source)
        body = source[heading.start():end].strip()
        text_path = f"texts/dante_inferno_c{number:02}.txt"
        rendered = f"{title}\nDante Alighieri\n\n{body}\n"
        destination = root / text_path
        old = existing.get(identifier, {})
        if old.get("audio") and (not destination.is_file() or destination.read_text(encoding="utf-8") != rendered):
            raise ValueError(f"Source changed for narrated section {identifier}")
        destination.write_text(rendered, encoding="utf-8")
        entry = {key: template[key] for key in (
            "author", "originalLanguage", "language", "year", "difficulty",
            "difficultyNote", "genre", "tags", "source", "rights"
        )}
        entry["rights"] = entry["rights"].replace("; project-produced local narration", "")
        entry.update(id=identifier, title=title, collection="dante-inferno", canto=number,
                     description=f"Canto {heading[1]} of Dante’s Inferno in the original Italian (section {number} of 34).")
        if old.get("audio"):
            entry.update(old)
        else:
            entry["text"] = text_path
        cover = f"covers/dante_inferno_c{number:02}.webp"
        if (root / cover).is_file():
            entry["cover"] = cover
        sections.append(entry)
    others = [entry for entry in library if entry["id"] != "dante-inferno" and not entry["id"].startswith("dante-inferno-c")]
    path.write_text(json.dumps(others + sections, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Imported 34 original Italian Inferno cantos")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    import_cantos(parser.parse_args().root)
