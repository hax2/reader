#!/usr/bin/env python3
"""Import Don Quijote sections from Project Gutenberg ebook #2000.

The novel is far too long for one reading, so it is added gradually as
chapter-group "sections". Each section becomes a text-only catalog entry;
scripts/local_tts.py then narrates them one at a time with --only.

Wave 1 (curated metadata) covers Part One, chapters 1-10. Later sections are
added ad hoc with --id/--chapters/--title so each wave can be curated when it
is actually scheduled instead of pre-creating an unbounded narration queue.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path

GUTENBERG_URL = "https://www.gutenberg.org/cache/epub/2000/pg2000.txt"
USER_AGENT = "reader-library-import/1.0"
AUTHOR = "Miguel de Cervantes Saavedra"
COLLECTION = "don-quijote"
RIGHTS = (
    "Public-domain work (1605/1615); Project Gutenberg transcription; "
    "project-produced local narration"
)
DIFFICULTY_NOTE = (
    "Golden-Age prose with archaic forms, inverted syntax, and period vocabulary."
)

WAVE_1 = [
    {
        "id": "quijote-p1-s01",
        "chapters": (1, 2),
        "title": "Don Quijote I.01: Un hidalgo de La Mancha",
        "description": "A reading-obsessed hidalgo renames himself a knight and rides out at dawn on his first adventure.",
        "tags": ["La Mancha", "Rocinante", "Dulcinea", "locura"],
    },
    {
        "id": "quijote-p1-s02",
        "chapters": (3, 4),
        "title": "Don Quijote I.02: La orden de caballería",
        "description": "An innkeeper's joke knights don Quijote, who then defends a beaten boy and charges a caravan of merchants.",
        "tags": ["venta", "caballería", "Andrés", "aventura"],
    },
    {
        "id": "quijote-p1-s03",
        "chapters": (5, 6),
        "title": "Don Quijote I.03: El escrutinio de la biblioteca",
        "description": "Beaten on the road, the knight is carried home while the cura and the barbero purge his library of books of chivalry.",
        "tags": ["biblioteca", "cura", "barbero", "libros"],
    },
    {
        "id": "quijote-p1-s04",
        "chapters": (7, 8),
        "title": "Don Quijote I.04: Los molinos de viento",
        "description": "With Sancho Panza on his donkey, don Quijote charges the famous windmills he refuses to see as anything but giants.",
        "tags": ["Sancho Panza", "molinos", "gigantes", "aventura"],
    },
    {
        "id": "quijote-p1-s05",
        "chapters": (9, 10),
        "title": "Don Quijote I.05: La batalla con el vizcaíno",
        "description": "The story resumes from a found manuscript as swords are drawn against the Biscayan, ending in an uneasy truce.",
        "tags": ["vizcaíno", "batalla", "Cide Hamete", "historia"],
    },
]

ROMAN_VALUES = {"I": 1, "V": 5, "X": 10, "L": 50}
CHAPTER_PATTERN = re.compile(r"^Capítulo ([Pp]rimero|[IVXL]+)\.", re.M)


def roman_to_number(roman: str) -> int:
    if roman.lower() == "primero":
        return 1
    total = 0
    for index, char in enumerate(roman):
        value = ROMAN_VALUES[char]
        if index + 1 < len(roman) and ROMAN_VALUES[roman[index + 1]] > value:
            total -= value
        else:
            total += value
    return total


def number_to_roman(number: int) -> str:
    pairs = [(50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    result = ""
    for value, symbol in pairs:
        while number >= value:
            result += symbol
            number -= value
    return result


def clean_paragraph(block: str) -> str:
    """Unwrap hard-wrapped lines and normalize ''…'' quotes to « »."""
    text = " ".join(line.strip() for line in block.splitlines())
    text = re.sub(r"\s+", " ", text).strip()
    parts = text.split("''")
    if len(parts) > 2:
        rebuilt = parts[0]
        for index, part in enumerate(parts[1:], 1):
            rebuilt += ("«" if index % 2 else "»") + part
        text = rebuilt.rstrip("«")
    return text


def parse_chapters(source: str) -> dict[int, dict[int, dict]]:
    """Return {part: {chapter_number: {"subject": str, "paragraphs": [str]}}}.

    Both parts restart their numbering at one, and Gutenberg ebook #2000 holds
    both, so chapters are keyed by part to keep them from clobbering each
    other.
    """
    body = source[: source.index("*** END OF")]
    matches = list(CHAPTER_PATTERN.finditer(body))
    part_two_start = body.rfind("Segunda parte del ingenioso")
    chapters: dict[int, dict[int, dict]] = {}
    for index, match in enumerate(matches):
        part = 2 if match.start() > part_two_start else 1
        segment_end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        segment = body[match.start():segment_end]
        stop = segment.find("\nFinis")
        if stop != -1:
            segment = segment[:stop]
        blocks = [block for block in re.split(r"\n\s*\n", segment) if block.strip()]
        heading = clean_paragraph(blocks[0])
        subject = re.sub(r"^Capítulo\s+\S+\.\s*", "", heading).strip()
        paragraphs = [clean_paragraph(block) for block in blocks[1:]]
        chapters.setdefault(part, {})[roman_to_number(match.group(1))] = {
            "subject": subject,
            "paragraphs": [paragraph for paragraph in paragraphs if paragraph],
        }
    return chapters


def section_body(chapters: dict[int, dict[int, dict]], part: int, first: int, last: int) -> str:
    pieces = []
    for number in range(first, last + 1):
        chapter = chapters[part][number]
        label = "primero" if number == 1 else number_to_roman(number)
        pieces.append(f"Capítulo {label}. {chapter['subject']}")
        pieces.extend(chapter["paragraphs"])
    return "\n\n".join(pieces)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache", type=Path,
        default=Path("/tmp/opencode/quijote/gutenberg2000.txt"),
        help="cached copy of the Gutenberg source (downloaded when missing)",
    )
    parser.add_argument("--id", help="ad-hoc section id, e.g. quijote-p1-s06")
    parser.add_argument("--part", type=int, default=1, choices=(1, 2), help="novel part for ad-hoc sections")
    parser.add_argument("--chapters", help="ad-hoc inclusive range, e.g. 11-12")
    parser.add_argument("--title", help="ad-hoc display title")
    parser.add_argument("--description", help="ad-hoc English description")
    parser.add_argument("--tags", help="comma-separated ad-hoc tags")
    args = parser.parse_args()

    sections: list[dict] = []
    if args.id or args.chapters:
        if not (args.id and args.chapters and args.title):
            parser.error("--id, --chapters and --title are required together for ad-hoc sections")
        first, last = (int(value) for value in args.chapters.split("-"))
        sections.append({
            "id": args.id,
            "part": args.part,
            "chapters": (first, last),
            "title": args.title,
            "description": args.description or "",
            "tags": [tag.strip() for tag in args.tags.split(",")] if args.tags else [],
        })
    else:
        sections.extend(WAVE_1)

    root = Path(__file__).resolve().parent.parent
    cache = args.cache.resolve()
    source = fetch_source(cache)
    chapters = parse_chapters(source)

    library_path = root / "library.json"
    library = json.loads(library_path.read_text(encoding="utf-8"))
    existing_by_id = {entry["id"]: entry for entry in library}
    known_ids = set(existing_by_id)

    for section in sections:
        part = section.get("part", 1)
        first, last = section["chapters"]
        missing = [number for number in range(first, last + 1) if number not in chapters[part]]
        if missing:
            raise SystemExit(f"{section['id']}: missing chapters {missing}")
        stem = section["id"].replace("-", "_")
        heading = f"{section['title']}\n{AUTHOR}"
        text_path = root / "texts" / f"{stem}.txt"
        rendered_text = f"{heading}\n\n{section_body(chapters, part, first, last)}\n"
        text_unchanged = (
            text_path.is_file()
            and text_path.read_text(encoding="utf-8") == rendered_text
        )
        text_path.write_text(rendered_text, encoding="utf-8")

        entry = {
            "id": section["id"],
            "title": section["title"],
            "author": AUTHOR,
            "year": 1605 if part == 1 else 1615,
            "part": part,
            "chapters": list(section["chapters"]),
            "difficulty": "C1",
            "difficultyNote": DIFFICULTY_NOTE,
            "genre": "Novel",
            "tags": section["tags"],
            "collection": COLLECTION,
            "source": "https://www.gutenberg.org/ebooks/2000",
            "rights": RIGHTS,
        }
        if section.get("description"):
            entry["description"] = section["description"]
        cover = root / "covers" / f"{stem}.webp"
        if cover.is_file():
            entry["cover"] = f"covers/{stem}.webp"
        text_reference = f"texts/{stem}.txt"
        existing = existing_by_id.get(section["id"], {})
        if text_unchanged and existing.get("audio"):
            entry["sourceText"] = text_reference
            for field in ("audio", "transcript", "audioGenerator", "mediaVersion"):
                if existing.get(field):
                    entry[field] = existing[field]
        else:
            entry["text"] = text_reference

        library = [item for item in library if item["id"] != section["id"]]
        library.append(entry)
        state = "updated" if section["id"] in known_ids else "added"
        print(f"{state} {section['id']}: caps {first}-{last} -> {text_path.name}")

    library_path.write_text(
        json.dumps(library, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def fetch_source(cache_path: Path) -> str:
    if cache_path.is_file():
        return cache_path.read_text(encoding="utf-8")
    request = urllib.request.Request(GUTENBERG_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        raw = response.read().decode("utf-8")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(raw, encoding="utf-8")
    return raw


if __name__ == "__main__":
    main()
