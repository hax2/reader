import { useRef, useEffect, useCallback } from "react";
import type { WordToken } from "../types";

export function findWordAt(words: WordToken[], time: number): number {
  let low = 0;
  let high = words.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const word = words[mid];
    if (time < word.start) high = mid - 1;
    else if (time >= word.end) low = mid + 1;
    else return mid;
  }
  return -1;
}

export function countEndedWords(words: WordToken[], time: number): number {
  let low = 0;
  let high = words.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (words[mid].end <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function scrollCurrentWordIntoView(reader: HTMLElement | null, currentWordIndex: number): void {
  if (!reader || currentWordIndex < 0) return;
  const wordEl = reader.querySelector(`[data-index="${currentWordIndex}"]`);
  wordEl?.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
}

export function setWordTabStop(reader: HTMLElement | null, button: HTMLButtonElement): void {
  if (!reader) return;
  reader.querySelector('.word[tabindex="0"]')?.setAttribute("tabindex", "-1");
  button.tabIndex = 0;
}

export function applyCurrentWord({
  reader,
  index,
  endedCount,
  currentWordIndexRef,
  readWordCountRef,
  renderedWordStartIndex = 0,
  renderedWordEndIndex = -1,
  isReadMode = false,
  scrollReader = true
}: {
  reader: HTMLElement | null;
  index: number;
  endedCount: number;
  currentWordIndexRef: { current: number };
  readWordCountRef: { current: number };
  renderedWordStartIndex?: number;
  renderedWordEndIndex?: number;
  isReadMode?: boolean;
  scrollReader?: boolean;
}): void {
  if (!reader) return;
  reader.classList.toggle("has-reading-position", !isReadMode && (index >= 0 || endedCount > renderedWordStartIndex));

  const currentDomHasClass =
    index < 0 || Boolean(reader.querySelector(`[data-index="${index}"]`)?.classList.contains("current"));
  const readDomHasClass =
    endedCount <= renderedWordStartIndex ||
    Boolean(reader.querySelector(`[data-index="${renderedWordStartIndex}"]`)?.classList.contains("read"));

  if (
    index === currentWordIndexRef.current &&
    endedCount === readWordCountRef.current &&
    currentDomHasClass &&
    readDomHasClass
  ) {
    return;
  }

  if (currentWordIndexRef.current >= 0) {
    reader.querySelector(`[data-index="${currentWordIndexRef.current}"]`)?.classList.remove("current");
  }

  if (!readDomHasClass) {
    readWordCountRef.current = -1;
  }

  const previousEndedCount =
    readWordCountRef.current < renderedWordStartIndex
      ? renderedWordStartIndex
      : Math.min(readWordCountRef.current, renderedWordEndIndex + 1);
  const firstChanged = Math.min(previousEndedCount, endedCount);
  const lastChanged = Math.max(previousEndedCount, endedCount);

  for (let wordIndex = firstChanged; wordIndex < lastChanged; wordIndex += 1) {
    reader.querySelector(`[data-index="${wordIndex}"]`)?.classList.toggle("read", wordIndex < endedCount);
  }

  currentWordIndexRef.current = index;
  readWordCountRef.current = endedCount;

  if (index < 0) return;
  reader.querySelector(`[data-index="${index}"]`)?.classList.add("current");
  if (scrollReader) {
    scrollCurrentWordIntoView(reader, index);
  }
}

export function useWordSync({
  readerRef,
  audioRef,
  words,
  isPlaying,
  isReadMode = false,
  readerMode = "listen",
  passageRevealed = false,
  renderedWordStartIndex = 0,
  renderedWordEndIndex = -1,
  onProgress
}: {
  readerRef: React.RefObject<HTMLElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  words: WordToken[];
  isPlaying: boolean;
  isReadMode?: boolean;
  readerMode?: "listen" | "read" | "passages";
  passageRevealed?: boolean;
  renderedWordStartIndex?: number;
  renderedWordEndIndex?: number;
  onProgress?: (time: number, duration: number) => void;
}) {
  const currentWordIndexRef = useRef<number>(-1);
  const readWordCountRef = useRef<number>(-1);
  const rafIdRef = useRef<number>(0);

  const endIndex = renderedWordEndIndex >= 0 ? renderedWordEndIndex : Math.max(0, words.length - 1);

  const applyWordIndex = useCallback(
    (wordIndex: number, scrollReader = true) => {
      if (!words.length || isReadMode) return;
      const clamped = Math.max(0, Math.min(wordIndex, words.length - 1));
      applyCurrentWord({
        reader: readerRef.current,
        index: clamped,
        endedCount: clamped,
        currentWordIndexRef,
        readWordCountRef,
        renderedWordStartIndex,
        renderedWordEndIndex: endIndex,
        isReadMode,
        scrollReader
      });
    },
    [endIndex, isReadMode, readerRef, renderedWordStartIndex, words.length]
  );

  const updateCurrentWord = useCallback(
    (time: number, scrollReader = true) => {
      if (!words.length || isReadMode) return;
      if (readerMode === "passages" && !passageRevealed) return;

      const index = findWordAt(words, time);
      const endedCount = Math.max(
        renderedWordStartIndex,
        Math.min(countEndedWords(words, time), endIndex + 1)
      );

      applyCurrentWord({
        reader: readerRef.current,
        index,
        endedCount,
        currentWordIndexRef,
        readWordCountRef,
        renderedWordStartIndex,
        renderedWordEndIndex: endIndex,
        isReadMode,
        scrollReader
      });
    },
    [endIndex, isReadMode, passageRevealed, readerMode, readerRef, renderedWordStartIndex, words]
  );

  const updateProgress = useCallback(
    ({ scrollReader = true }: { scrollReader?: boolean } = {}) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.currentTime)) return;
      const time = audio.currentTime;
      updateCurrentWord(time, scrollReader);
      if (audio.duration) {
        onProgress?.(time, audio.duration);
      }
    },
    [audioRef, onProgress, updateCurrentWord]
  );

  // 60fps animation frame loop when playing audio
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      return;
    }

    const tick = () => {
      updateProgress();
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
    };
  }, [isPlaying, updateProgress]);

  const resetSyncState = useCallback(() => {
    currentWordIndexRef.current = -1;
    readWordCountRef.current = -1;
    if (readerRef.current) {
      readerRef.current.classList.remove("has-reading-position");
      readerRef.current.querySelectorAll(".word.current").forEach((w) => w.classList.remove("current"));
      readerRef.current.querySelectorAll(".word.read").forEach((w) => w.classList.remove("read"));
    }
  }, [readerRef]);

  return {
    currentWordIndexRef,
    readWordCountRef,
    applyWordIndex,
    updateCurrentWord,
    updateProgress,
    resetSyncState
  };
}
