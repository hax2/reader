import assert from "node:assert/strict";
import fs from "node:fs";
import { alignVerseWords } from "../src/utils/verseAlignment.ts";
import { tokenizeUntimed, parseJsonTranscript, stripCatalogTextHeader } from "../src/utils/tokenization.ts";
import { setSavedTranslationBlocks, lookupSavedVerseTranslation } from "../src/utils/translations.ts";
import type { Track } from "../src/types.ts";

const catalog: Track[] = JSON.parse(fs.readFileSync("library.json", "utf8"));
let total = 0;
let narrated = 0;
for (const book of catalog.filter(track => track.collection === "dante-inferno")) {
  const payload = JSON.parse(fs.readFileSync(`translations/${book.id}.en.json`, "utf8"));
  assert.equal(payload.trackId, book.id);
  assert.equal(payload.alignment, "verse-line");
  setSavedTranslationBlocks(payload.blocks);
  const source = stripCatalogTextHeader(fs.readFileSync(book.sourceText || book.text!, "utf8"), book);
  const original = tokenizeUntimed(source);
  let words = original;
  if (book.transcript) {
    words = alignVerseWords(original, parseJsonTranscript(fs.readFileSync(book.transcript, "utf8")));
    narrated++;
    assert.deepEqual(words.map(word => word.text), original.map(word => word.text));
    for (let i = 0; i < words.length; i++) {
      assert.ok(Number.isFinite(words[i].start) && words[i].end >= words[i].start);
      if (i) assert.ok(words[i].start >= words[i - 1].end);
    }
  }
  const lines = words.map(word => `${word.prefix || ""}${word.text}${word.separator || " "}`).join("").split(/\n/).map(line => line.trim()).filter(Boolean);
  assert.equal(lines.length, payload.blocks.length);
  lines.forEach((line, index) => {
    assert.equal(lookupSavedVerseTranslation(index, line), payload.blocks[index].translation, `${book.id}, line ${index}`);
  });
  total += lines.length - 1;
}
assert.equal(total, 4720);
const source = tokenizeUntimed("Nel mezzo del cammin\ndi nostra vita.");
const spoken = [
  { text: "Nel", start: 0, end: 0.2, index: 0 },
  { text: "mezzo", start: 0.2, end: 0.5, index: 1 },
  { text: "cammin", start: 0.8, end: 1.2, index: 2 },
  { text: "di", start: 1.2, end: 1.3, index: 3 },
  { text: "nostra", start: 1.3, end: 1.6, index: 4 },
  { text: "vita", start: 1.6, end: 2, index: 5 }
];
const aligned = alignVerseWords(source, spoken);
assert.equal(aligned[2].text, "del");
assert.equal(aligned[2].start, 0.5);
assert.equal(aligned[2].end, 0.8);
assert.equal(aligned[3].start, 0.8);
assert.equal(aligned[3].separator, "\n");
console.log(`Verified all ${total.toLocaleString()} verse translations, including ${narrated} narrated canto(s), with no translation network requests.`);
