import { useState, useEffect, useRef, useCallback } from "react";
import { speechSynthesisSupported } from "../utils/constants";
import { setMediaSessionPlaybackState } from "../utils/mediaSession";
import type { WordToken, TtsChunk, TtsOffset, AppearanceSettings } from "../types";

export function isUsableSpeechVoice(voice: SpeechSynthesisVoice | null): boolean {
  if (!voice) return false;
  const descriptor = `${voice.name || ""} ${voice.voiceURI || ""}`;
  if (/\bmbrola\b/i.test(descriptor)) return false;
  return true;
}

export function isNoveltySpeechVoice(voice: SpeechSynthesisVoice): boolean {
  const descriptor = `${voice.name || ""} ${voice.voiceURI || ""}`;
  return descriptor.includes("+");
}

export function scoreSpanishVoice(voice: SpeechSynthesisVoice): number {
  let score = 0;
  const lang = String(voice.lang || "").toLowerCase();
  const name = String(voice.name || "").toLowerCase();
  if (/^es(?:-|$)/i.test(lang)) score += 100;
  if (lang === "es-es" || lang === "es-mx" || lang === "es-419" || lang === "es-us" || lang === "es") score += 25;
  if (lang === "es-la") score += 20;
  if (/natural|neural|google|microsoft|paulina|monica|mónica|jorge|elvira|alvaro|álvaro|dalia|helena|laura|pablo/i.test(name)) {
    score += 40;
  }
  if (!isNoveltySpeechVoice(voice)) score += 30;
  if (voice.localService) score += 5;
  if (voice.default) score += 10;
  return score;
}

export function createTtsChunk(list: WordToken[], startWord: number, endWord: number): TtsChunk {
  let text = "";
  const offsets: TtsOffset[] = [];
  for (let index = startWord; index <= endWord; index += 1) {
    const prefix = list[index].prefix || "";
    text += prefix;
    offsets.push({ charIndex: text.length, wordIndex: index });
    text += `${list[index].text}${list[index].separator || (index < endWord ? " " : "")}`;
  }
  return { startWord, endWord, text: text.trimEnd(), offsets };
}

export function createTtsSegment(chunk: TtsChunk, startWord: number, wordsList: WordToken[]): TtsChunk {
  if (startWord <= chunk.startWord) return chunk;
  return createTtsChunk(wordsList, startWord, chunk.endWord);
}

export function buildTtsChunks(list: WordToken[]): TtsChunk[] {
  const chunks: TtsChunk[] = [];
  let startWord = 0;
  let characterCount = 0;
  for (let index = 0; index < list.length; index += 1) {
    const word = list[index];
    const spoken = `${word.prefix || ""}${word.text}${word.separator || " "}`;
    characterCount += spoken.length;
    const sentenceEnd = /[.!?…]["')\]»”]*\s*$/u.test(`${word.text}${word.separator || " "}`);
    const clauseBreak =
      characterCount >= 140 && /[,;:—–]["')\]»”]*\s*$/u.test(`${word.text}${word.separator || " "}`);
    const hardBreak = characterCount >= 220 || index - startWord >= 42;
    if (!sentenceEnd && !clauseBreak && !hardBreak && index < list.length - 1) continue;
    chunks.push(createTtsChunk(list, startWord, index));
    startWord = index + 1;
    characterCount = 0;
  }
  return chunks;
}

export function findTtsChunkAtWord(chunks: TtsChunk[], wordIndex: number): number {
  if (!chunks.length) return 0;
  let low = 0;
  let high = chunks.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const chunk = chunks[middle];
    if (wordIndex < chunk.startWord) high = middle - 1;
    else if (wordIndex > chunk.endWord) low = middle + 1;
    else return middle;
  }
  return Math.max(0, Math.min(low, chunks.length - 1));
}

export function wordAtTtsCharacter(offsets: TtsOffset[], charIndex: number): number {
  let low = 0;
  let high = offsets.length - 1;
  let match = offsets[0]?.wordIndex || 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (offsets[middle].charIndex <= charIndex) {
      match = offsets[middle].wordIndex;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return match;
}

export function initializeSpeechVoices(
  onVoices: (voices: SpeechSynthesisVoice[]) => void
): () => void {
  if (!speechSynthesisSupported) return () => {};
  const load = () => {
    const available = window.speechSynthesis.getVoices().filter(isUsableSpeechVoice);
    onVoices(available);
  };
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
  return () => {
    window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  };
}

export function configureTextToSpeech(
  words: WordToken[],
  onChunks: (chunks: TtsChunk[]) => void
): void {
  const chunks = buildTtsChunks(words);
  onChunks(chunks);
}

export function resetTextToSpeechUi(): void {
  if (speechSynthesisSupported) {
    window.speechSynthesis.cancel();
  }
}

export function updateTtsProgress(
  wordIndex: number,
  onWordChange?: (index: number) => void
): void {
  onWordChange?.(wordIndex);
}

export function updateTtsPlaybackUi(isPlaying: boolean): void {
  setMediaSessionPlaybackState(isPlaying ? "playing" : "paused");
}

export function useBrowserTts({
  words,
  appearanceSettings,
  onWordChange,
  onStatusChange,
  readerRef
}: {
  words: WordToken[];
  appearanceSettings: AppearanceSettings;
  onWordChange?: (wordIndex: number) => void;
  onStatusChange?: (msg: string) => void;
  readerRef: React.RefObject<HTMLElement | null>;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(appearanceSettings.ttsVoiceURI || "");
  const [ttsState, setTtsState] = useState<"idle" | "playing" | "paused">("idle");
  const [ttsWordIndex, setTtsWordIndex] = useState<number>(0);
  const [chunks, setChunks] = useState<TtsChunk[]>([]);
  const chunkIndexRef = useRef<number>(0);
  const ttsSessionIdRef = useRef<number>(0);
  const ttsWordTimerRef = useRef<number>(0);
  const ttsBoundaryFiredRef = useRef<boolean>(false);
  const ttsWordIndexRef = useRef<number>(0);
  const ttsStateRef = useRef<"idle" | "playing" | "paused">("idle");

  ttsWordIndexRef.current = ttsWordIndex;
  ttsStateRef.current = ttsState;

  const clearTtsFallbackHighlight = useCallback(() => {
    if (!readerRef.current) return;
    readerRef.current.querySelectorAll(".word.tts-fallback").forEach((word) => word.classList.remove("tts-fallback"));
  }, [readerRef]);

  const setTtsFallbackHighlight = useCallback(
    (startWord: number, endWord: number) => {
      clearTtsFallbackHighlight();
      if (!readerRef.current) return;
      for (let index = startWord; index <= endWord; index += 1) {
        readerRef.current.querySelector(`[data-index="${index}"]`)?.classList.add("tts-fallback");
      }
    },
    [clearTtsFallbackHighlight, readerRef]
  );

  const clearTtsWordTimer = useCallback(() => {
    if (ttsWordTimerRef.current) {
      window.clearTimeout(ttsWordTimerRef.current);
      ttsWordTimerRef.current = 0;
    }
  }, []);

  const refreshSpeechVoices = useCallback(() => {
    if (!speechSynthesisSupported) return [];
    const available = window.speechSynthesis.getVoices().filter(isUsableSpeechVoice);
    if (!available.length) {
      setVoices([]);
      return [];
    }
    const spanishVoices = available.filter((voice) => /^es(?:-|_|$)/i.test(voice.lang));
    const cleanSpanishVoices = spanishVoices.filter((voice) => !isNoveltySpeechVoice(voice));
    const cleanAnyVoices = available.filter((voice) => !isNoveltySpeechVoice(voice));
    const candidatePool = cleanSpanishVoices.length
      ? cleanSpanishVoices
      : spanishVoices.length
        ? spanishVoices
        : cleanAnyVoices.length
          ? cleanAnyVoices
          : available;

    const sorted = [...candidatePool].sort((a, b) => {
      const scoreDiff = scoreSpanishVoice(b) - scoreSpanishVoice(a);
      if (scoreDiff !== 0) return scoreDiff;
      return `${a.lang} ${a.name}`.localeCompare(`${b.lang} ${b.name}`);
    });
    setVoices(sorted);
    return sorted;
  }, []);

  useEffect(() => {
    if (!speechSynthesisSupported) return;
    const loaded = refreshSpeechVoices();
    if (!loaded.length) {
      let attempts = 0;
      const retry = () => {
        attempts += 1;
        const res = refreshSpeechVoices();
        if (!res.length && attempts < 6) {
          window.setTimeout(retry, 350 * attempts);
        }
      };
      const timer = window.setTimeout(retry, 250);
      return () => window.clearTimeout(timer);
    }
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshSpeechVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", refreshSpeechVoices);
    };
  }, [refreshSpeechVoices]);

  useEffect(() => {
    if (words.length) {
      const built = buildTtsChunks(words);
      setChunks(built);
    } else {
      setChunks([]);
    }
  }, [words]);

  const selectedTtsVoice = useCallback(() => {
    const list = voices.length ? voices : refreshSpeechVoices();
    return list.find((v) => v.voiceURI === selectedVoiceURI) || list[0] || null;
  }, [refreshSpeechVoices, selectedVoiceURI, voices]);

  const setTtsWord = useCallback(
    (index: number, scrollReader: boolean = true) => {
      if (!words.length) return;
      const clamped = Math.max(0, Math.min(index, words.length - 1));
      setTtsWordIndex(clamped);
      onWordChange?.(clamped);
    },
    [onWordChange, words.length]
  );

  const startTtsWordTimer = useCallback(
    (segment: TtsChunk, rate: number, sessionId: number) => {
      clearTtsWordTimer();
      const safeRate = Math.max(0.5, Number(rate) || 1);
      let cursor = segment.startWord;

      const scheduleNext = () => {
        if (
          sessionId !== ttsSessionIdRef.current ||
          ttsStateRef.current !== "playing" ||
          ttsBoundaryFiredRef.current
        ) {
          return;
        }
        const currentWord = words[cursor];
        if (!currentWord || cursor >= segment.endWord) return;
        const chars = Math.max(2, currentWord.text.length);
        const punctuationPause = /[.!?…]/u.test(currentWord.separator || "")
          ? 240
          : /[,;:—–]/u.test(currentWord.separator || "")
            ? 120
            : 0;
        const delayMs = Math.max(95, Math.round((chars * 52 + 75 + punctuationPause) / safeRate));
        ttsWordTimerRef.current = window.setTimeout(() => {
          if (
            sessionId !== ttsSessionIdRef.current ||
            ttsStateRef.current !== "playing" ||
            ttsBoundaryFiredRef.current
          ) {
            return;
          }
          cursor += 1;
          if (cursor <= segment.endWord) {
            setTtsWord(cursor, true);
            scheduleNext();
          }
        }, delayMs);
      };

      scheduleNext();
    },
    [clearTtsWordTimer, setTtsWord, words]
  );

  const stopTextToSpeech = useCallback(
    ({ preservePosition = false }: { preservePosition?: boolean } = {}) => {
      if (!speechSynthesisSupported) return;
      ttsSessionIdRef.current += 1;
      clearTtsWordTimer();
      clearTtsFallbackHighlight();
      window.speechSynthesis.cancel();
      setTtsState("idle");
      setMediaSessionPlaybackState("paused");
      if (!preservePosition) {
        setTtsWordIndex(0);
        chunkIndexRef.current = 0;
      }
    },
    [clearTtsFallbackHighlight, clearTtsWordTimer]
  );

  const speakTtsChunk = useCallback(
    (chunkIndex: number, startWord: number, sessionId: number, useDefaultVoice = false) => {
      if (sessionId !== ttsSessionIdRef.current || chunkIndex < 0 || chunkIndex >= chunks.length) {
        return;
      }
      clearTtsWordTimer();
      ttsBoundaryFiredRef.current = false;
      const chunk = chunks[chunkIndex];
      const segment = createTtsSegment(chunk, Math.max(chunk.startWord, startWord), words);
      const utterance = new SpeechSynthesisUtterance(segment.text);
      const voice = useDefaultVoice ? null : selectedTtsVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ? voice.lang.replace("_", "-") : "es-ES";
      utterance.rate = appearanceSettings.playbackRate;
      utterance.pitch = 1;

      utterance.onstart = () => {
        if (sessionId !== ttsSessionIdRef.current) return;
        setTtsState("playing");
        setMediaSessionPlaybackState("playing");
        setTtsFallbackHighlight(segment.startWord, segment.endWord);
        setTtsWord(segment.startWord, true);
        startTtsWordTimer(segment, utterance.rate, sessionId);
      };

      utterance.onboundary = (event) => {
        if (sessionId !== ttsSessionIdRef.current || !Number.isFinite(event.charIndex)) return;
        if (event.name !== "sentence") {
          ttsBoundaryFiredRef.current = true;
          clearTtsWordTimer();
          clearTtsFallbackHighlight();
        }
        setTtsWord(wordAtTtsCharacter(segment.offsets, event.charIndex), true);
      };

      utterance.onend = () => {
        if (sessionId !== ttsSessionIdRef.current) return;
        clearTtsWordTimer();
        clearTtsFallbackHighlight();
        setTtsWord(segment.endWord, false);
        const nextChunk = chunkIndex + 1;
        if (nextChunk < chunks.length) {
          chunkIndexRef.current = nextChunk;
          speakTtsChunk(nextChunk, chunks[nextChunk].startWord, sessionId, useDefaultVoice);
          return;
        }
        setTtsWordIndex(words.length);
        setTtsState("idle");
        setMediaSessionPlaybackState("paused");
        onStatusChange?.("Finished reading.");
      };

      utterance.onerror = (event) => {
        if (sessionId !== ttsSessionIdRef.current || ["canceled", "interrupted"].includes(event.error)) {
          return;
        }
        clearTtsWordTimer();
        if (!useDefaultVoice && voice) {
          speakTtsChunk(chunkIndex, startWord, sessionId, true);
          return;
        }
        clearTtsFallbackHighlight();
        setTtsState("idle");
        setMediaSessionPlaybackState("paused");
        onStatusChange?.("This browser voice stopped unexpectedly. Try another voice or a slower speed.");
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      appearanceSettings.playbackRate,
      chunks,
      clearTtsFallbackHighlight,
      clearTtsWordTimer,
      onStatusChange,
      selectedTtsVoice,
      setTtsFallbackHighlight,
      setTtsWord,
      startTtsWordTimer,
      words
    ]
  );

  const speakTextFromWord = useCallback(
    (wordIndex: number) => {
      if (!speechSynthesisSupported || !chunks.length) return;
      const nextWord = Math.max(0, Math.min(Math.floor(wordIndex), words.length - 1));
      const sessionId = ++ttsSessionIdRef.current;
      clearTtsWordTimer();
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      clearTtsFallbackHighlight();
      setTtsState("playing");
      setTtsWordIndex(nextWord);
      const cIndex = findTtsChunkAtWord(chunks, nextWord);
      chunkIndexRef.current = cIndex;
      speakTtsChunk(cIndex, nextWord, sessionId);
    },
    [chunks, clearTtsFallbackHighlight, clearTtsWordTimer, speakTtsChunk, words.length]
  );

  const pauseTextToSpeech = useCallback(() => {
    if (!speechSynthesisSupported || ttsState !== "playing") return;
    clearTtsWordTimer();
    window.speechSynthesis.pause();
    setTtsState("paused");
    setMediaSessionPlaybackState("paused");
  }, [clearTtsWordTimer, ttsState]);

  const toggleTextToSpeech = useCallback(() => {
    if (!speechSynthesisSupported || !words.length) {
      onStatusChange?.("Browser text-to-speech is unavailable here.");
      return;
    }
    if (ttsState === "playing") {
      pauseTextToSpeech();
      return;
    }
    if (ttsState === "paused") {
      window.speechSynthesis.resume();
      setTtsState("playing");
      setMediaSessionPlaybackState("playing");
      const chunk = chunks[chunkIndexRef.current];
      if (chunk && !ttsBoundaryFiredRef.current) {
        const segment = createTtsSegment(chunk, Math.max(chunk.startWord, ttsWordIndex), words);
        startTtsWordTimer(segment, appearanceSettings.playbackRate, ttsSessionIdRef.current);
      }
      return;
    }
    const idx = ttsWordIndex >= words.length ? 0 : ttsWordIndex;
    speakTextFromWord(idx);
  }, [
    appearanceSettings.playbackRate,
    chunks,
    onStatusChange,
    pauseTextToSpeech,
    speakTextFromWord,
    startTtsWordTimer,
    ttsState,
    ttsWordIndex,
    words
  ]);

  const restartTextToSpeech = useCallback(
    (autoplay: boolean) => {
      const wordIndex = Math.min(ttsWordIndex, Math.max(0, words.length - 1));
      stopTextToSpeech({ preservePosition: true });
      if (autoplay) speakTextFromWord(wordIndex);
    },
    [speakTextFromWord, stopTextToSpeech, ttsWordIndex, words.length]
  );

  const seekTextToSpeech = useCallback(
    (wordIndex: number) => {
      const wasPlaying = ttsState === "playing";
      stopTextToSpeech({ preservePosition: true });
      const clamped = Math.max(0, Math.min(Math.floor(wordIndex), Math.max(0, words.length - 1)));
      setTtsWordIndex(clamped);
      chunkIndexRef.current = findTtsChunkAtWord(chunks, clamped);
      if (wasPlaying) {
        speakTextFromWord(clamped);
      }
    },
    [chunks, speakTextFromWord, stopTextToSpeech, ttsState, words.length]
  );

  const moveTtsChunk = useCallback(
    (direction: number) => {
      if (!chunks.length) return;
      const wasPlaying = ttsState === "playing";
      let currentChunk = findTtsChunkAtWord(chunks, Math.min(ttsWordIndex, Math.max(0, words.length - 1)));
      if (direction < 0 && ttsWordIndex > chunks[currentChunk].startWord + 2) {
        // Return to beginning of current sentence
      } else {
        currentChunk = Math.max(0, Math.min(currentChunk + direction, chunks.length - 1));
      }
      stopTextToSpeech({ preservePosition: true });
      chunkIndexRef.current = currentChunk;
      const newWordIndex = chunks[currentChunk].startWord;
      setTtsWordIndex(newWordIndex);
      if (wasPlaying) speakTextFromWord(newWordIndex);
    },
    [chunks, speakTextFromWord, stopTextToSpeech, ttsState, ttsWordIndex, words.length]
  );

  return {
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    ttsState,
    ttsWordIndex,
    chunks,
    toggleTextToSpeech,
    speakTextFromWord,
    pauseTextToSpeech,
    stopTextToSpeech,
    restartTextToSpeech,
    seekTextToSpeech,
    moveTtsChunk,
    setTtsWord
  };
}
