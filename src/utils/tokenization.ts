import { toSeconds, parseTimestamp, utf8ByteLength } from "./text";
import type { WordToken, Track } from "../types";

export function tokenizeUntimed(text: string): WordToken[] {
  const matches = text.matchAll(/[\p{L}\p{M}\d]+(?:['’][\p{L}\p{M}\d]+)?|[^\p{L}\p{M}\d]+/gu);
  const parsed: { text: string; prefix?: string; separator?: string }[] = [];
  let pendingPrefix = "";
  for (const match of matches) {
    const token = match[0];
    if (/^[\p{L}\p{M}\d]/u.test(token)) {
      parsed.push({ text: token, prefix: pendingPrefix, separator: "" });
      pendingPrefix = "";
    } else if (parsed.length) {
      parsed[parsed.length - 1].separator = (parsed[parsed.length - 1].separator || "") + token;
    } else {
      pendingPrefix += token;
    }
  }
  for (let index = 0; index < parsed.length; index += 1) {
    const sep = parsed[index].separator || "";
    const splitMatch = sep.match(/^([\s\S]*?\s+)([¿¡«“"'(\[—–-]+)$/u);
    if (splitMatch && index + 1 < parsed.length) {
      parsed[index].separator = splitMatch[1];
      parsed[index + 1].prefix = (parsed[index + 1].prefix || "") + splitMatch[2];
    }
  }
  return parsed.map((item, index) => ({
    text: item.text,
    index,
    start: Number.NaN,
    end: Number.NaN,
    prefix: item.prefix || "",
    separator: item.separator || ""
  }));
}

export function wordsFromSegment(segment: { text?: string; start?: number | string; end?: number | string }): WordToken[] {
  const tokens = tokenizeUntimed(segment.text || "");
  const start = toSeconds(segment.start);
  const end = toSeconds(segment.end);
  const span = Math.max(0.05, (end - start) / Math.max(1, tokens.length));
  return tokens.map((token, index) => ({
    ...token,
    start: start + index * span,
    end: start + (index + 1) * span
  }));
}

export function parseJsonTranscript(text: string): WordToken[] {
  const data = JSON.parse(text);
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data.words)
      ? data.words
      : Array.isArray(data.segments)
        ? data.segments.flatMap((segment: { words?: unknown[]; text?: string; start?: number; end?: number }) =>
            segment.words || wordsFromSegment(segment)
          )
        : [];

  return source
    .map((item: { word?: string; text?: string; start?: number | string; startTime?: number | string; end?: number | string; endTime?: number | string; prefix?: string; separator?: string }, index: number) => ({
      text: String(item.word ?? item.text ?? "").trim(),
      index,
      start: toSeconds(item.start ?? item.startTime),
      end: toSeconds(item.end ?? item.endTime),
      prefix: item.prefix || "",
      separator: item.separator || " "
    }))
    .filter((item: WordToken) => item.text);
}

export function parseCueTranscript(text: string): WordToken[] {
  const clean = text.replace(/\r/g, "");
  const blocks = clean
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const parsed: WordToken[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim() && line.trim() !== "WEBVTT");
    const timingLine = lines.find((line) => line.includes("-->"));
    if (!timingLine) continue;
    const timingIndex = lines.indexOf(timingLine);
    const [rawStart, rawEnd] = timingLine.split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const start = parseTimestamp(rawStart);
    const end = parseTimestamp(rawEnd);
    const cueText = lines.slice(timingIndex + 1).join(" ").replace(/<[^>]+>/g, "");
    const cueWords = tokenizeUntimed(cueText);
    const span = Math.max(0.05, (end - start) / Math.max(1, cueWords.length));
    cueWords.forEach((word, index) => {
      parsed.push({
        ...word,
        index: parsed.length,
        start: start + index * span,
        end: start + (index + 1) * span
      });
    });
  }

  return parsed;
}

export function stripCatalogTextHeader(text: string, track: { title?: string; author?: string }): string {
  const lines = text.replace(/\r/g, "").split("\n");
  if (lines[0]?.trim() === track.title && lines[1]?.trim() === track.author && !lines[2]?.trim()) {
    return lines.slice(3).join("\n");
  }
  return text;
}

export function parseTranscript(text: string, name: string): WordToken[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lower = name.toLowerCase();
  if (lower.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonTranscript(trimmed);
  }
  if (lower.endsWith(".vtt") || lower.endsWith(".srt") || trimmed.includes("-->")) {
    return parseCueTranscript(trimmed);
  }
  return tokenizeUntimed(trimmed);
}

export function wordWeight(text: string): number {
  return Math.max(0.7, Math.min(2.8, text.length / 4));
}

export function assignApproximateTimes(list: WordToken[], duration: number): void {
  if (!duration || !Number.isFinite(duration) || !list.length) return;
  const weightedTotal = list.reduce((sum, word) => sum + wordWeight(word.text), 0);
  let cursor = 0;
  for (const word of list) {
    const wordDuration = duration * (wordWeight(word.text) / weightedTotal);
    word.start = cursor;
    word.end = cursor + wordDuration;
    cursor = word.end;
  }
}

export function normalizedTranslationSource(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function splitTextByBytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && utf8ByteLength(candidate) > maxBytes) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
