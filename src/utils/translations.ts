import {
  htmlToText,
  decodeHtmlEntities,
  escapeHtml,
  utf8ByteLength
} from "./text";
import {
  normalizedTranslationSource,
  splitTextByBytes
} from "./tokenization";
import {
  loadTranslationCache,
  saveTranslationCache
} from "./storage";
import type { SavedTranslationBlock, Track } from "../types";

let inMemoryTranslationCache: Record<string, string> = loadTranslationCache();
const translationRequests = new Map<string, Promise<string>>();

export function isInvalidTranslationResponse(value: unknown): boolean {
  const text = String(value || "").trim();
  if (!text) return true;
  return /MYMEMORY WARNING|YOU USED ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT EXCEEDED|INVALID EMAIL/i.test(text);
}

export function getCachedTranslation(context: string): string {
  const cached = inMemoryTranslationCache[context] || "";
  if (cached && isInvalidTranslationResponse(cached)) {
    delete inMemoryTranslationCache[context];
    return "";
  }
  return cached;
}

export async function fetchGoogleGtxTranslation(
  text: string,
  { dictionary = false }: { dictionary?: boolean } = {}
): Promise<string> {
  const cleanText = htmlToText(text);
  if (!cleanText) return "";
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);
  try {
    const dtParams = dictionary ? "dt=t&dt=bd" : "dt=t";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&${dtParams}&q=${encodeURIComponent(cleanText)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("GTX lookup failed");
    const data = await response.json();
    if (dictionary && Array.isArray(data?.[1]) && data[1].length) {
      const terms: string[] = [];
      for (const group of data[1]) {
        if (Array.isArray(group?.[1])) {
          for (const term of group[1]) {
            if (term && terms.length < 3 && !terms.includes(term)) terms.push(term);
          }
        }
      }
      if (terms.length) return terms.join(", ");
    }
    const translated = Array.isArray(data?.[0])
      ? data[0].map((segment: unknown[]) => segment?.[0] || "").join("").trim()
      : "";
    if (!translated || isInvalidTranslationResponse(translated)) {
      throw new Error("Empty GTX translation");
    }
    return translated;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchTranslation(
  context: string,
  options: { targetTag?: string; fallbackText?: string } = {}
): Promise<string> {
  const cached = getCachedTranslation(context);
  if (cached) return cached;
  if (translationRequests.has(context)) return translationRequests.get(context)!;

  const request = (async () => {
    const plainFallback = htmlToText(options.fallbackText || context);
    try {
      if (!options.targetTag || options.fallbackText) {
        try {
          const gtx = await fetchGoogleGtxTranslation(plainFallback, {
            dictionary: !plainFallback.includes(" ")
          });
          if (gtx) {
            inMemoryTranslationCache[context] = gtx;
            saveTranslationCache(inMemoryTranslationCache);
            return gtx;
          }
        } catch {
          // Fall back to MyMemory below.
        }
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(context)}&langpair=es|en`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Lookup failed");
        const data = await response.json();
        const rawTranslation = data?.responseData?.translatedText;
        if (!rawTranslation || isInvalidTranslationResponse(rawTranslation)) {
          throw new Error("No valid translation returned");
        }
        const decodedTranslation = decodeHtmlEntities(String(rawTranslation));
        let translated = decodedTranslation;
        if (options.targetTag) {
          translated = extractMarkedTranslation(decodedTranslation, options.targetTag);
          if (!translated && plainFallback) {
            translated = await fetchGoogleGtxTranslation(plainFallback);
          }
          if (!translated) throw new Error("Translation target marker was not returned");
        }
        inMemoryTranslationCache[context] = translated;
        saveTranslationCache(inMemoryTranslationCache);
        return translated;
      } finally {
        window.clearTimeout(timeoutId);
      }
    } finally {
      translationRequests.delete(context);
    }
  })();

  translationRequests.set(context, request);
  return request;
}

export function extractMarkedTranslation(value: string, tagName: string): string {
  const safeTag = String(tagName).replace(/[^a-z0-9]/gi, "");
  if (!safeTag) return "";
  const match = value.match(new RegExp(`<${safeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safeTag}>`, "i"));
  return match?.[1]?.trim() || "";
}

export function buildContextualTranslationRequest(
  targetHTML: string,
  beforeText: string,
  afterText: string,
  targetTag: string
): string {
  const beforeWords = beforeText.trim().split(/\s+/).filter(Boolean);
  const afterWords = afterText.trim().split(/\s+/).filter(Boolean);
  const prefix: string[] = [];
  const suffix: string[] = [];
  const markedTarget = `<${targetTag}>${targetHTML}</${targetTag}>`;
  let canAddBefore = true;
  let canAddAfter = true;

  const compose = (nextPrefix = prefix, nextSuffix = suffix) =>
    [
      nextPrefix.length ? escapeHtml(nextPrefix.join(" ")) : "",
      markedTarget,
      nextSuffix.length ? escapeHtml(nextSuffix.join(" ")) : ""
    ]
      .filter(Boolean)
      .join(" ");

  while ((beforeWords.length && canAddBefore) || (afterWords.length && canAddAfter)) {
    if (beforeWords.length && canAddBefore) {
      const word = beforeWords.pop()!;
      const nextPrefix = [word, ...prefix];
      if (utf8ByteLength(compose(nextPrefix, suffix)) <= 480) prefix.unshift(word);
      else canAddBefore = false;
    }
    if (afterWords.length && canAddAfter) {
      const word = afterWords.shift()!;
      const nextSuffix = [...suffix, word];
      if (utf8ByteLength(compose(prefix, nextSuffix)) <= 480) suffix.push(word);
      else canAddAfter = false;
    }
  }
  return compose();
}

export function splitTranslationSentences(value: string): string[] {
  const text = normalizedTranslationSource(value);
  if (!text) return [];
  return (text.match(/[^.!?…]+(?:[.!?…]+["')\]»”]*|$)/g) || [text])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function splitTranslationSentencesByWords(value: string): string[] {
  const text = normalizedTranslationSource(value);
  if (!text) return [];
  const wordsInBlock = text.split(" ").filter(Boolean);
  const sentences: string[] = [];
  let current: string[] = [];
  for (let index = 0; index < wordsInBlock.length; index += 1) {
    const word = wordsInBlock[index];
    current.push(word);
    if (
      (/[.!?…]["')\]»”]*$/u.test(word) && index < wordsInBlock.length - 1) ||
      index === wordsInBlock.length - 1
    ) {
      sentences.push(current.join(" "));
      current = [];
    }
  }
  return sentences.filter(Boolean);
}

export function getPartitions<T>(arr: T[], k: number): T[][][] {
  if (k === 1) return [[arr]];
  if (arr.length === k) return [arr.map((x) => [x])];
  if (arr.length < k) return [];

  const partitions: T[][][] = [];
  for (let i = 1; i <= arr.length - k + 1; i++) {
    const firstGroup = arr.slice(0, i);
    const rest = arr.slice(i);
    const subPartitions = getPartitions(rest, k - 1);
    for (const sub of subPartitions) {
      partitions.push([firstGroup, ...sub]);
    }
  }
  return partitions;
}

export function splitTranslationSentence(sentence: string): string[] {
  const candidates = [...sentence.matchAll(/[,;:—–]\s+/g)]
    .map((match) => (match.index ?? 0) + match[0].length)
    .filter((index) => index > sentence.length * 0.25 && index < sentence.length * 0.75);
  let splitAt = candidates.sort(
    (a, b) => Math.abs(a - sentence.length / 2) - Math.abs(b - sentence.length / 2)
  )[0];
  if (!splitAt) {
    const spaces = [...sentence.matchAll(/\s+/g)]
      .map((match) => (match.index ?? 0) + match[0].length)
      .filter((index) => index > sentence.length * 0.3 && index < sentence.length * 0.7);
    splitAt = spaces.sort(
      (a, b) => Math.abs(a - sentence.length / 2) - Math.abs(b - sentence.length / 2)
    )[0];
  }
  if (!splitAt) return [sentence];
  return [sentence.slice(0, splitAt).trim(), sentence.slice(splitAt).trim()].filter(Boolean);
}

export function fitTranslationSentences(translation: string, sourceSentences: string[]): string[] {
  let sentences = splitTranslationSentences(translation);
  const desiredCount = sourceSentences.length;

  while (sentences.length < desiredCount) {
    const splitIndex = sentences.reduce(
      (longest, sentence, index) => (sentence.length > sentences[longest].length ? index : longest),
      0
    );
    const parts = splitTranslationSentence(sentences[splitIndex]);
    if (parts.length < 2) break;
    sentences.splice(splitIndex, 1, ...parts);
  }

  if (sentences.length > desiredCount) {
    const sourceLengths = sourceSentences.map((s) => s.length);
    const sourceTotal = sourceLengths.reduce((a, b) => a + b, 0);
    const targetLengths = sentences.map((s) => s.length);
    const targetTotal = targetLengths.reduce((a, b) => a + b, 0);

    while (sentences.length - desiredCount > 10) {
      let mergeIndex = 0;
      let shortestPair = Number.POSITIVE_INFINITY;
      for (let index = 0; index < sentences.length - 1; index += 1) {
        const pairLength = sentences[index].length + sentences[index + 1].length;
        if (pairLength < shortestPair) {
          shortestPair = pairLength;
          mergeIndex = index;
        }
      }
      sentences.splice(mergeIndex, 2, `${sentences[mergeIndex]} ${sentences[mergeIndex + 1]}`);
    }

    const partitions = getPartitions(sentences, desiredCount);
    let bestCost = Infinity;
    let bestPartition: string[][] | null = null;

    for (const p of partitions) {
      let cost = 0;
      for (let i = 0; i < desiredCount; i++) {
        const groupLength = p[i].reduce((sum, s) => sum + s.length, 0);
        const sRatio = sourceLengths[i] / sourceTotal;
        const tRatio = groupLength / targetTotal;
        cost += Math.pow(sRatio - tRatio, 2);
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestPartition = p;
      }
    }

    if (bestPartition) {
      sentences = bestPartition.map((group) => group.join(" "));
    }
  }

  return sentences;
}

let savedTranslationBlocks: SavedTranslationBlock[] = [];
let savedTranslationLookup = new Map<string, string>();

export async function loadSavedTrackTranslation(track: Track): Promise<SavedTranslationBlock[]> {
  if (!track.englishTranslation) return [];
  try {
    const response = await fetch(track.englishTranslation);
    if (!response.ok) return [];
    const payload = await response.json();
    if (payload?.trackId !== track.id || !Array.isArray(payload.blocks)) return [];
    return payload.blocks;
  } catch {
    return [];
  }
}

export function setSavedTranslationBlocks(blocks: SavedTranslationBlock[]): void {
  savedTranslationBlocks = Array.isArray(blocks) ? blocks : [];
  savedTranslationLookup = new Map();
  for (const block of savedTranslationBlocks) {
    const source = String(block?.source || "").trim();
    const translation = String(block?.translation || "").trim();
    if (!source || !translation) continue;
    savedTranslationLookup.set(normalizedTranslationSource(source), translation);

    for (const splitter of [splitTranslationSentences, splitTranslationSentencesByWords]) {
      const sourceSentences = splitter(source);
      if (sourceSentences.length < 2) continue;
      const translatedSentences = fitTranslationSentences(translation, sourceSentences);
      sourceSentences.forEach((sentence, index) => {
        const key = normalizedTranslationSource(sentence);
        if (translatedSentences[index] && !savedTranslationLookup.has(key)) {
          savedTranslationLookup.set(key, translatedSentences[index]);
        }
      });
    }
  }
}

export function lookupSavedTranslation(source: string): string {
  const norm = normalizedTranslationSource(source);
  if (!norm) return "";
  const direct = savedTranslationLookup.get(norm);
  if (direct) return direct;

  for (const splitter of [splitTranslationSentencesByWords, splitTranslationSentences]) {
    const parts = splitter(source);
    if (parts.length > 1) {
      const translatedParts = parts.map((part) =>
        savedTranslationLookup.get(normalizedTranslationSource(part))
      );
      if (translatedParts.every(Boolean)) {
        return translatedParts.join(" ");
      }
    }
  }
  return "";
}

export function splitTranslationText(text: string, maxBytes: number): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) continue;
    const combined = current ? `${current} ${cleanSentence}` : cleanSentence;
    if (utf8ByteLength(combined) <= maxBytes) {
      current = combined;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = "";
    }
    if (utf8ByteLength(cleanSentence) <= maxBytes) {
      current = cleanSentence;
      continue;
    }
    const sentenceChunks = splitTextByBytes(cleanSentence, maxBytes);
    chunks.push(...sentenceChunks.slice(0, -1));
    current = sentenceChunks.at(-1) || "";
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function translateReadingText(
  source: string,
  outerBefore = "",
  outerAfter = ""
): Promise<string> {
  const directCached = getCachedTranslation(source);
  if (directCached) return directCached;
  try {
    const gtxResult = await fetchGoogleGtxTranslation(source);
    if (gtxResult) {
      inMemoryTranslationCache[source] = gtxResult;
      saveTranslationCache(inMemoryTranslationCache);
      return gtxResult;
    }
  } catch {
    // Fall back to contextual chunked translation below.
  }

  const chunks = splitTranslationText(source, 300);
  const translated: string[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const before = [outerBefore, ...chunks.slice(0, index)].filter(Boolean).join(" ");
    const after = [...chunks.slice(index + 1), outerAfter].filter(Boolean).join(" ");
    const contextualRequest = buildContextualTranslationRequest(escapeHtml(chunk), before, after, "b");
    translated.push(
      await fetchTranslation(contextualRequest, {
        targetTag: "b",
        fallbackText: chunk
      })
    );
  }
  const combined = translated.join(" ");
  if (combined) {
    inMemoryTranslationCache[source] = combined;
    saveTranslationCache(inMemoryTranslationCache);
  }
  return combined;
}
