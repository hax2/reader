#!/usr/bin/env python3
"""Import Longfellow's public-domain English Inferno, aligned to Italian verse lines."""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path
from translate_catalog_google import atomic_write_json

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = 'https://www.gutenberg.org/ebooks/1001'
TEXT_URL = 'https://www.gutenberg.org/cache/epub/1001/pg1001.txt'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--source', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    if args.source:
        english = args.source.read_text(encoding='utf-8-sig')
    else:
        with urllib.request.urlopen(TEXT_URL, timeout=30) as response:
            english = response.read().decode('utf-8-sig')
    english = english[:english.index('*** END OF THE PROJECT GUTENBERG')]
    headings = list(re.finditer(r'^Inferno: Canto ([IVXL]+)\s*$', english, re.M))
    if len(headings) != 34:
        raise ValueError('Expected 34 English cantos')
    total = 0
    for index, heading in enumerate(headings):
        number = index + 1
        identifier = f'dante-inferno-c{number:02}'
        italian = (root / f'texts/dante_inferno_c{number:02}.txt').read_text(encoding='utf-8')
        lines = [line.strip() for line in italian.splitlines()[4:] if line.strip()]
        end = headings[index + 1].start() if index + 1 < len(headings) else len(english)
        translated = [line.strip() for line in english[heading.end():end].splitlines() if line.strip()]
        if len(lines) != len(translated):
            raise ValueError(f'Canto {heading[1]}: {len(lines)} Italian versus {len(translated)} English lines')
        blocks = [dict(source=f'Canto {heading[1]}', translation=f'Canto {heading[1]}')]
        blocks += [dict(source=source, translation=target, line=line) for line, (source, target) in enumerate(zip(lines, translated), 1)]
        payload = dict(trackId=identifier, sourceLanguage='it', targetLanguage='en',
                       translator='Henry Wadsworth Longfellow', translationYear=1867,
                       source=SOURCE_URL, rights='Public-domain English translation; Project Gutenberg ebook #1001.',
                       alignment='verse-line', sourceHash=hashlib.sha256(italian.encode()).hexdigest(), blocks=blocks)
        relative = f'translations/{identifier}.en.json'
        atomic_write_json(root / relative, payload)
        total += len(lines)
    if total != 4720:
        raise ValueError(f'Expected 4,720 verse pairs, got {total}')
    print(f'Saved {total:,} verse-line translations across 34 cantos')


if __name__ == '__main__':
    main()
