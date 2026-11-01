import assert from "node:assert/strict";
import fs from "node:fs";
import { fetchTranslation, getCachedTranslation, translateReadingText } from "../src/utils/translations.ts";
import { fetchSingleWordMeaning } from "../src/utils/vocab.ts";

// Exercise the real translation path without depending on external services.
Object.assign(globalThis, { window: { setTimeout, clearTimeout } });
const requests: URL[] = [];
let failGoogle = false;
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  requests.push(url);
  if (url.hostname === "translate.googleapis.com") {
    if (failGoogle) throw new Error("Simulated provider outage");
    return new Response(JSON.stringify([[[`${url.searchParams.get("sl")}:English`, "", null, null]]]));
  }
  return new Response(JSON.stringify({ responseData: { translatedText: "fallback English" } }));
};

await Promise.all([
  fetchTranslation("come", { sourceLanguage: "it" }),
  fetchTranslation("come")
]);
assert.equal(getCachedTranslation("come", "it"), "it:English");
assert.equal(getCachedTranslation("come"), "es:English");
assert.equal(requests.length, 2, "Concurrent languages must not share requests");
assert.equal(await translateReadingText("selva oscura", "", "", "it"), "it:English");
assert.equal(requests.at(-1)?.searchParams.get("sl"), "it");
assert.equal(await fetchSingleWordMeaning("largo", "it"), "it:English", "Italian must bypass the Spanish glossary");
failGoogle = true;
await fetchTranslation("stelle", { sourceLanguage: "it" });
assert.equal(requests.at(-1)?.searchParams.get("langpair"), "it|en");

const library = JSON.parse(fs.readFileSync("library.json", "utf8"));
const books = library.filter((item: { collection: string }) => item.collection === "dante-inferno");
assert.equal(books.length, 34);
const text = books.map((book: { language: string; text?: string; sourceText?: string }, index: number) => {
  assert.equal(book.language, "it");
  const section = fs.readFileSync(book.text || book.sourceText!, "utf8");
  const body = section.split("\n").slice(3).join("\n");
  assert.ok(body.startsWith("Canto "));
  return body;
}).join("\n");
const cantos = [...text.matchAll(/^Canto ([IVXL]+)$/gm)].map((match) => match[1]);
assert.equal(cantos.length, 34);
assert.equal(new Set(cantos).size, 34);
assert.equal(cantos[0], "I");
assert.equal(cantos.at(-1), "XXXIV");
assert.ok(text.includes("Nel mezzo del cammin di nostra vita\nmi ritrovai per una selva oscura,"));
assert.ok(text.trimEnd().endsWith("E quindi uscimmo a riveder le stelle."));
assert.equal(text.split("\n").filter((line) => line.trim() && !/^Canto /.test(line)).length, 4720);
console.log("Language routing, cache isolation, provider fallback, glossary isolation, and all 4,720 Inferno verses verified.");
