#!/usr/bin/env python3
"""Download the public-domain Bécquer stories used by the reader."""

from __future__ import annotations

import json
import re
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

API_URL = "https://es.wikisource.org/w/api.php"
STORIES = (
    {
        "page": "El monte de las ánimas",
        "title": "El monte de las ánimas",
        "filename": "el_monte_de_las_animas.txt",
        "opening": ("a noche de difuntos", "La noche de difuntos"),
    },
    {
        "page": "El rayo de luna",
        "title": "El rayo de luna",
        "filename": "el_rayo_de_luna.txt",
        "opening": ("o no sé si esto", "Yo no sé si esto"),
    },
    {
        "page": "La ajorca de oro",
        "title": "La ajorca de oro",
        "filename": "la_ajorca_de_oro.txt",
        "opening": ("lla era hermosa", "Ella era hermosa"),
    },
)


def main() -> None:
    output_dir = Path(__file__).resolve().parents[1] / "texts"
    output_dir.mkdir(exist_ok=True)

    sources = ["# Text sources", ""]
    for story in STORIES:
        html = fetch_rendered_page(story["page"])
        text = extract_story(html, story["title"], story["opening"])
        path = output_dir / story["filename"]
        path.write_text(
            f"{story['title']}\nGustavo Adolfo Bécquer\n\n{text}\n",
            encoding="utf-8",
        )
        source_url = "https://es.wikisource.org/wiki/" + urllib.parse.quote(
            story["page"].replace(" ", "_")
        )
        sources.append(f"- [{story['title']}]({source_url})")
        print(f"Wrote {path.relative_to(output_dir.parent)}")

    sources.extend(
        [
            "",
            "The stories were published in the nineteenth century and are in the public domain.",
            "The Wikisource transcriptions preserve the historical spelling of their editions.",
            "",
        ]
    )
    (output_dir / "SOURCES.md").write_text("\n".join(sources), encoding="utf-8")


def fetch_rendered_page(page: str) -> str:
    query = urllib.parse.urlencode(
        {
            "action": "parse",
            "page": page,
            "prop": "text",
            "format": "json",
        }
    )
    request = urllib.request.Request(
        f"{API_URL}?{query}",
        headers={"User-Agent": "SpanishListeningReader/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.load(response)
    return payload["parse"]["text"]["*"]


def extract_story(
    html: str, title: str, opening_correction: tuple[str, str]
) -> str:
    converted = subprocess.run(
        [
            "html2text",
            "--ignore-links",
            "--ignore-images",
            "--unicode-snob",
            "--body-width=0",
        ],
        input=html,
        text=True,
        capture_output=True,
        check=True,
    ).stdout

    lines = [clean_markdown(line) for line in converted.splitlines()]
    heading = title.upper()
    starts = [
        index
        for index, line in enumerate(lines)
        if line == heading or line.startswith(f"{heading}.") or line.startswith(f"{heading}—")
    ]
    if starts:
        body_lines = lines[starts[-1] + 1 :]
        while body_lines and (not body_lines[0] or body_lines[0] == "* * *"):
            body_lines.pop(0)
    else:
        old, new = opening_correction
        opening = next(
            (
                index
                for index, line in enumerate(lines)
                if line.lower().startswith((old.lower(), new.lower()))
            ),
            None,
        )
        if opening is None:
            raise RuntimeError(f"Could not find the story opening for {title}")
        body_lines = lines[opening:]

    text = "\n".join(body_lines).strip()
    old, new = opening_correction
    text = re.sub(
        rf"^{re.escape(old)}",
        new,
        text,
        count=1,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def clean_markdown(line: str) -> str:
    line = line.rstrip().replace("**", "").replace("__", "")
    if line.startswith("_") and line.endswith("_"):
        line = line[1:-1]
    return line.strip()


if __name__ == "__main__":
    main()
