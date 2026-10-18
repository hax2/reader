import {
  PASSAGE_MIN_SECONDS,
  PASSAGE_TARGET_SECONDS,
  PASSAGE_MAX_SECONDS,
  PASSAGE_MAX_WORDS
} from "./constants";
import { hasValidTimings } from "./text";
import type { WordToken, Passage } from "../types";

export function passageBoundaryScore(list: WordToken[], index: number): number {
  const word = list[index];
  const next = list[index + 1];
  const tail = `${word.text}${word.separator || ""}`;
  let score = 0;
  if (/[.!?…]["')\]»”]*\s*$/.test(tail)) score += 4;
  else if (/[,;:…]["')\]]*\s*$/.test(tail)) score += 1;
  if (
    next &&
    Number.isFinite(next.start) &&
    Number.isFinite(word.end) &&
    next.start - word.end >= 0.55
  ) {
    score += 2;
  }
  return score;
}

export function createPassage(list: WordToken[], startWordIndex: number, endWordIndex: number): Passage {
  const wordEnd = list[endWordIndex].end;
  const nextWordStart = list[endWordIndex + 1]?.start;
  const paddedEnd = Number.isFinite(nextWordStart)
    ? Math.min(wordEnd + 0.25, nextWordStart)
    : wordEnd + 0.25;
  const guard = Math.min(0.04, Math.max(0, paddedEnd - wordEnd));
  return {
    startWordIndex,
    endWordIndex,
    startTime: Math.max(0, list[startWordIndex].start - 0.15),
    endTime: paddedEnd - guard
  };
}

export function buildPassages(list: WordToken[]): Passage[] {
  if (!list.length || !hasValidTimings(list)) return [];
  const spans: Passage[] = [];
  const lastIndex = list.length - 1;
  let start = 0;
  while (start <= lastIndex) {
    let end = start;
    while (end < lastIndex && list[end].end - list[start].start < PASSAGE_MIN_SECONDS) end += 1;
    if (end < lastIndex) {
      let bestEnd = -1;
      let bestScore = 0;
      for (let probe = end; probe < lastIndex; probe += 1) {
        const elapsed = list[probe].end - list[start].start;
        const count = probe - start + 1;
        if (elapsed > PASSAGE_TARGET_SECONDS || count > PASSAGE_MAX_WORDS) break;
        const score = passageBoundaryScore(list, probe);
        if (score > bestScore) {
          bestScore = score;
          bestEnd = probe;
        }
      }
      if (bestEnd >= 0) {
        end = bestEnd;
      } else {
        while (end < lastIndex) {
          const elapsed = list[end].end - list[start].start;
          const count = end - start + 1;
          if (elapsed >= PASSAGE_MAX_SECONDS || count >= PASSAGE_MAX_WORDS) break;
          end += 1;
          if (elapsed >= PASSAGE_TARGET_SECONDS && passageBoundaryScore(list, end) > 0) break;
        }
      }
    }
    spans.push(createPassage(list, start, end));
    start = end + 1;
  }
  return spans;
}

export function findPassageAt(passages: Passage[], time: number): number {
  if (!passages.length || !Number.isFinite(time)) return -1;
  let low = 0;
  let high = passages.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (passages[mid].startTime <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
