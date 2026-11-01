import type { WordToken } from "../types";

// Keep the printed verse text intact; use recognized words only as timing anchors.
export function alignVerseWords(source: WordToken[], spoken: WordToken[]): WordToken[] {
  if (!source.length || !spoken.length) return source;
  const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[^\p{L}\d]/gu, "");
  const left = source.map(word => normalize(word.text));
  const right = spoken.map(word => normalize(word.text));
  const width = spoken.length + 1;
  const scores = new Uint16Array((source.length + 1) * width);
  for (let i = source.length - 1; i >= 0; i--) {
    for (let j = spoken.length - 1; j >= 0; j--) {
      scores[i * width + j] = left[i] === right[j]
        ? scores[(i + 1) * width + j + 1] + 1
        : Math.max(scores[(i + 1) * width + j], scores[i * width + j + 1]);
    }
  }
  const anchors = new Map<number, WordToken>();
  let i = 0;
  let j = 0;
  while (i < source.length && j < spoken.length) {
    if (left[i] === right[j]) {
      anchors.set(i++, spoken[j++]);
    } else if (scores[(i + 1) * width + j] >= scores[i * width + j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  const result = source.map(word => ({ ...word }));
  let previousEnd = 0;
  for (let start = 0; start < result.length;) {
    const anchor = anchors.get(start);
    if (anchor) {
      result[start].start = Math.max(previousEnd, anchor.start);
      result[start].end = Math.max(result[start].start, anchor.end);
      previousEnd = result[start++].end;
      continue;
    }
    let end = start + 1;
    while (end < result.length && !anchors.has(end)) end++;
    const nextStart = Math.max(previousEnd, anchors.get(end)?.start ?? spoken.at(-1)!.end);
    const duration = (nextStart - previousEnd) / (end - start);
    for (let index = start; index < end; index++) {
      result[index].start = previousEnd + (index - start) * duration;
      result[index].end = previousEnd + (index - start + 1) * duration;
    }
    previousEnd = nextStart;
    start = end;
  }
  return result;
}
