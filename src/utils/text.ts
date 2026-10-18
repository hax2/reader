import { difficultyOrder } from "./constants";
import type { Track, WordToken } from "../types";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char] || char));
}

export function sanitizeEmphasisHtml(value: unknown): string {
  if (typeof document === "undefined") return String(value ?? "");
  const template = document.createElement("template");
  template.innerHTML = String(value ?? "");

  const sanitizeNode = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(node.childNodes)) fragment.append(sanitizeNode(child));
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "B") {
      const bold = document.createElement("b");
      bold.append(fragment);
      return bold;
    }
    return fragment;
  };

  const container = document.createElement("div");
  for (const child of Array.from(template.content.childNodes)) container.append(sanitizeNode(child));
  return container.innerHTML;
}

export function htmlToText(value: unknown): string {
  if (typeof document === "undefined") return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const template = document.createElement("template");
  template.innerHTML = String(value ?? "");
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(value: string): string {
  if (typeof document === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

export function normalizeWord(word: string): string {
  return word.toLocaleLowerCase("es").replace(/[^\p{L}\p{M}\d]/gu, "");
}

export function escapeRegex(string: string): string {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function tsvField(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n/g, "<br>")
    .replace(/\t/g, " ")
    .trim();
}

export function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

export function safeSetLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Reading remains usable in private mode or when storage is full.
  }
}

export function safeDecodeHash(): string {
  if (typeof location === "undefined") return "";
  const raw = location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function difficultyDescription(level: string): string {
  const descriptions: Record<string, string> = {
    A2: "Brief, approachable language",
    B1: "Familiar narration with some literary vocabulary",
    B2: "Layered prose and a broader vocabulary",
    C1: "Dense, historical, or stylistically demanding"
  };
  return descriptions[level] || "Unrated";
}

export function readingMinutes(wordCount: unknown): number {
  return Math.max(1, Math.round(Number(wordCount || 0) / 180));
}

export function normalizeSearch(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function compareTitle(a: { title: string }, b: { title: string }): number {
  return String(a.title).localeCompare(String(b.title), "es", { sensitivity: "base" });
}

export function compareTracks(a: Track, b: Track, sortOption: string = "difficulty"): number {
  if (sortOption === "length") return (a.minutes || 999) - (b.minutes || 999) || compareTitle(a, b);
  if (sortOption === "author") return String(a.author || "").localeCompare(String(b.author || ""), "es") || compareTitle(a, b);
  if (sortOption === "title") return compareTitle(a, b);
  return (
    (difficultyOrder as readonly string[]).indexOf(a.difficulty) -
    (difficultyOrder as readonly string[]).indexOf(b.difficulty) ||
    compareTitle(a, b)
  );
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = String(whole % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function parseTimestamp(value: string): number {
  const parts = value.replace(",", ".").split(":").map(Number);
  if (parts.some(Number.isNaN)) return Number.NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export function toSeconds(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  if (/^\d+(\.\d+)?s?$/.test(value)) return Number.parseFloat(value);
  return parseTimestamp(value);
}

export function hasValidTimings(list: WordToken[]): boolean {
  let previousStart = -Infinity;
  let previousEnd = -Infinity;
  return list.length > 0 && list.every((word) => {
    const valid =
      Number.isFinite(word.start) &&
      Number.isFinite(word.end) &&
      word.start >= previousStart &&
      word.end >= previousEnd &&
      word.end >= word.start;
    previousStart = word.start;
    previousEnd = word.end;
    return valid;
  });
}

export function progressLabel(saved?: { time?: number; duration?: number }): string {
  if (!saved?.time || !saved?.duration) return "Not started";
  const percent = Math.min(100, Math.round((saved.time / saved.duration) * 100));
  if (percent >= 97) return "Completed";
  return `${formatTime(saved.time)} of ${formatTime(saved.duration)} · ${percent}%`;
}

export function textProgressLabel(saved?: { wordIndex?: number; wordCount?: number }): string {
  if (!saved?.wordCount || !saved?.wordIndex) return "Ready to read or listen";
  const percent = Math.min(100, Math.round((saved.wordIndex / saved.wordCount) * 100));
  if (percent >= 100) return "Completed";
  return `${Number(saved.wordIndex).toLocaleString()} of ${Number(saved.wordCount).toLocaleString()} words · ${percent}%`;
}

export function formatPlaybackRate(rate: number): string {
  if (rate === 1 || rate === 2) return `${rate}×`;
  return `${rate.toFixed(2)}×`;
}
