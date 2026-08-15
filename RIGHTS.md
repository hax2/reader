# Sources and rights

The public catalog is intentionally limited to works whose authors died long enough ago for the original Spanish text to be in the public domain in Spain and the United States.

## Texts

The reading texts come from Spanish Wikisource. The underlying literary works are public domain; the Wikisource transcriptions are provided under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Per-work attribution links are stored in `library.json` and listed in `texts/SOURCES.md`. Historical spelling is preserved unless a correction can be checked against the source edition.

## Audio

The three published Bécquer narrations were generated for this repository from the included public-domain source texts. Their timed transcripts were also produced in this project. No imported or provenance-unclear recordings are included in the public catalog.

## Covers

Catalog covers are rendered from local metadata with original HTML and CSS. They do not reproduce book jackets, scans, photographs, or third-party artwork.

## Adding a work

Every public entry must include a stable ID, author, source URL, rights note, editorial difficulty assessment, and a local text or a locally produced narration. `python3 scripts/build_library.py --check` enforces the required catalog fields and file references.
