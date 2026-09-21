#!/usr/bin/env python3
"""Import curated readings in history, espionage, and philosophy from stable Spanish sources."""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

USER_AGENT = "SpanishListeningReader/1.0 (https://github.com/hax2/reader)"


def fetch_wikisource(page: str) -> list[str]:
    params = urllib.parse.urlencode({
        "action": "parse",
        "page": page,
        "prop": "text",
        "format": "json",
    })
    req = urllib.request.Request(f"https://es.wikisource.org/w/api.php?{params}", headers={"User-Agent": USER_AGENT})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
                html = data["parse"]["text"]["*"]
                soup = BeautifulSoup(html, "html.parser")
                for tag in soup.select("table, .mw-editsection, sup.reference, style, script, .noprint, figure"):
                    tag.decompose()
                paras = [re.sub(r"\s+", " ", p.get_text(" ", strip=True)).strip() for p in soup.select("p")]
                return [p for p in paras if p]
        except Exception as error:
            print(f"Attempt {attempt + 1} failed for {page}: {error}")
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Failed to fetch {page}")


def get_poe_text() -> str:
    paras = fetch_wikisource("La carta robada (Olivera tr.)")
    cleaned = []
    started = False
    for p in paras:
        if "Al anochecer de una noche del otoño" in p:
            started = True
        if started:
            cleaned.append(p)
    return "\n\n".join(cleaned)


def get_machiavelli_text() -> str:
    chapters = [
        ("XV", "De aquellas cosas por las cuales los hombres y especialmente los príncipes son alabados o censurados"),
        ("XVII", "De la crueldad y la clemencia; y si es mejor ser amado que temido, o ser temido que amado"),
        ("XVIII", "De qué modo los príncipes deben guardar la palabra dada"),
        ("XXI", "Cómo debe conducirse un príncipe para adquirir consideración"),
    ]
    sections = []
    for num, title in chapters:
        time.sleep(1)
        paras = fetch_wikisource(f"El príncipe (1854)/Capítulo {num}")
        body_paras = [p for p in paras if not re.match(r"^CAP[IÍ]TULO\s+[IVXLCDM]+", p, re.IGNORECASE)]
        sections.append(f"Capítulo {num}: {title}\n\n" + "\n\n".join(body_paras))
    return "\n\n\n".join(sections)


def get_seneca_text() -> str:
    paras = fetch_wikisource("De la brevedad de la vida")
    cleaned = []
    for p in paras:
        if p.startswith("←") or p.startswith("Obtenido de"):
            continue
        cleaned.append(p)
    return "\n\n".join(cleaned)


def get_plutarch_text() -> str:
    paras = fetch_wikisource("Vidas paralelas/Alejandro")
    selected = paras[:9]
    return "\n\n".join(selected)


READINGS = [
    {
        "id": "poe-carta-robada",
        "stem": "poe_carta_robada",
        "title": "La carta robada",
        "author": "Edgar Allan Poe",
        "translator": "Carlos Olivera",
        "year": 1844,
        "difficulty": "B2",
        "difficultyNote": "Analytical prose with psychological dialogue, deduction, and 19th-century Spanish phrasing.",
        "genre": "Mystery / Intelligence",
        "tags": ["espionaje", "misterio", "Dupin", "detective", "inteligencia", "Francia", "espionage", "philosophy"],
        "description": "A stolen royal letter, diplomatic blackmail, covert police searches, and C. Auguste Dupin's lesson in deceptive psychology.",
        "source": "https://es.wikisource.org/wiki/La_carta_robada_(Olivera_tr.)",
        "rights": "Public-domain work; Wikisource transcription CC BY-SA 4.0",
        "collection": "stories",
        "fetcher": get_poe_text,
    },
    {
        "id": "maquiavelo-principe",
        "stem": "maquiavelo_principe",
        "title": "El Príncipe: La zorra y el león",
        "author": "Nicolás Maquiavelo",
        "year": 1532,
        "difficulty": "B2",
        "difficultyNote": "Classic political discourse with direct philosophical argumentation and Renaissance statecraft.",
        "genre": "Political philosophy",
        "tags": ["filosofía", "política", "historia", "estrategia", "poder", "intriga", "philosophy", "espionage", "history"],
        "description": "Classic treatise on statecraft, political realism, whether it is better to be loved or feared, and why a ruler must know how to be both the fox and the lion.",
        "source": "https://es.wikisource.org/wiki/El_pr%C3%ADncipe_(1854)",
        "rights": "Public-domain work (1532; 1854 Spanish edition); Wikisource transcription CC BY-SA 4.0",
        "collection": "stories",
        "fetcher": get_machiavelli_text,
    },
    {
        "id": "seneca-brevedad-vida",
        "stem": "seneca_brevedad_vida",
        "title": "De la brevedad de la vida",
        "author": "Lucio Anneo Séneca",
        "year": 49,
        "difficulty": "B2",
        "difficultyNote": "Lively Stoic rhetoric, vivid contemporary Roman examples, and reflective moral philosophy.",
        "genre": "Stoic philosophy",
        "tags": ["filosofía", "Séneca", "estoicismo", "tiempo", "sabiduría", "vida", "philosophy"],
        "description": "Seneca's timeless philosophical meditation on why life is not short, but wasted by frivolous ambition, and how to reclaim one's time.",
        "source": "https://es.wikisource.org/wiki/De_la_brevedad_de_la_vida",
        "rights": "Public-domain classical work; historical Spanish translation; Wikisource transcription CC BY-SA 4.0",
        "collection": "stories",
        "fetcher": get_seneca_text,
    },
    {
        "id": "plutarco-alejandro-bucefalo",
        "stem": "plutarco_alejandro_bucefalo",
        "title": "Alejandro Magno y Bucéfalo",
        "author": "Plutarco",
        "translator": "Antonio Ranz Romanillos",
        "editionYear": 1821,
        "difficulty": "B2",
        "difficultyNote": "Classic historical narrative and character study in early 19th-century Spanish prose.",
        "genre": "Historical biography",
        "tags": ["historia", "Grecia", "Alejandro Magno", "Plutarco", "biografía", "Bucéfalo", "history", "filosofía", "philosophy"],
        "description": "Plutarch's celebrated chronicle of Alexander the Great's youth, his tutoring under Aristotle, and the taming of the indomitable horse Bucephalus.",
        "source": "https://es.wikisource.org/wiki/Vidas_paralelas/Alejandro",
        "rights": "Public-domain classical work; 1821 Spanish edition; Wikisource transcription CC BY-SA 4.0",
        "collection": "greek-classics",
        "originalLanguage": "Ancient Greek",
        "fetcher": get_plutarch_text,
    },
]


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    texts_dir = root / "texts"
    texts_dir.mkdir(exist_ok=True)

    for reading in READINGS:
        text_file = texts_dir / f"{reading['stem']}.txt"
        if not text_file.exists() or text_file.stat().st_size < 500:
            print(f"Fetching {reading['title']}...", flush=True)
            body = reading["fetcher"]()
            content = f"{reading['title']}\n{reading['author']}\n\n{body}\n"
            text_file.write_text(content, encoding="utf-8")
            print(f"Wrote {text_file} ({len(content.split())} words)")
        else:
            print(f"Already exists: {text_file}")

    library_path = root / "library.json"
    library = json.loads(library_path.read_text(encoding="utf-8"))
    existing_by_id = {item.get("id"): item for item in library if item.get("id")}
    imported_ids = {reading["id"] for reading in READINGS}
    remaining_library = [item for item in library if item.get("id") not in imported_ids]

    new_entries = []
    for reading in READINGS:
        existing = existing_by_id.get(reading["id"], {})
        entry = {
            "id": reading["id"],
            "title": reading["title"],
            "author": reading["author"],
            "difficulty": reading["difficulty"],
            "difficultyNote": reading["difficultyNote"],
            "genre": reading["genre"],
            "tags": reading["tags"],
            "description": reading["description"],
            "collection": reading.get("collection", "stories"),
            "source": reading["source"],
            "rights": reading["rights"],
            "cover": f"covers/{reading['stem']}.webp",
            "text": f"texts/{reading['stem']}.txt",
        }
        if "year" in reading:
            entry["year"] = reading["year"]
        if "translator" in reading:
            entry["translator"] = reading["translator"]
        if "editionYear" in reading:
            entry["editionYear"] = reading["editionYear"]
        if "originalLanguage" in reading:
            entry["originalLanguage"] = reading["originalLanguage"]
        if "englishTranslation" in existing:
            entry["englishTranslation"] = existing["englishTranslation"]
        new_entries.append(entry)

    final_library = list(remaining_library)
    final_library.extend(new_entries)
    library_path.write_text(json.dumps(final_library, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {library_path} with {len(new_entries)} new curated readings.")


if __name__ == "__main__":
    main()
