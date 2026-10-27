import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  Track,
  WordToken,
  Passage,
  AppearanceSettings,
  CatalogSettings,
  ProgressCache,
  StudyLog,
  ReaderMode
} from "./types";
import {
  loadAppearanceSettings,
  saveAppearanceSettings,
  applyAppearanceSettings,
  defaultAppearanceSettings,
  loadCatalogSettings,
  saveCatalogSettings,
  loadProgressCache,
  saveProgressCache,
  saveActiveProgress,
  loadStudyLog,
  saveStudyLog,
  logStudiedWord,
  readPersonalBooks,
  deletePersonalBook,
  savePersonalBook,
  createPersonalBookId
} from "./utils/storage";
import { parseUploadedFile, titleFromFilename } from "./utils/fileParsers";
import {
  safeDecodeHash,
  readingMinutes,
  hasValidTimings,
  formatTime,
  normalizeWord,
  escapeHtml
} from "./utils/text";
import {
  parseTranscript,
  stripCatalogTextHeader,
  tokenizeUntimed,
  assignApproximateTimes
} from "./utils/tokenization";
import {
  loadSavedTrackTranslation,
  setSavedTranslationBlocks
} from "./utils/translations";
import { loadSharedGlossary } from "./utils/vocab";
import { buildPassages, findPassageAt } from "./utils/passages";
import { updateMediaSession } from "./utils/mediaSession";
import { speechSynthesisSupported, difficultyOrder, collectionOptions } from "./utils/constants";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useBrowserTts, pronounceSpanishWord } from "./hooks/useBrowserTts";
import { useWordSync, findWordAt, countEndedWords } from "./hooks/useWordSync";
import { usePassages } from "./hooks/usePassages";
import { useOnboardingDemo } from "./hooks/useOnboardingDemo";
import { TopBar } from "./components/TopBar";
import { CatalogControls } from "./components/CatalogControls";
import { TrackList, getVisibleTracks } from "./components/TrackList";
import { ReaderTopBar } from "./components/ReaderTopBar";
import { ReaderText } from "./components/ReaderText";
import { PlayerBar } from "./components/PlayerBar";
import { PassagePractice } from "./components/PassagePractice";
import { VocabWarmup } from "./components/VocabWarmup";
import { WordPopover, type SideDefinition } from "./components/WordPopover";
import { AnkiReviewModal } from "./components/AnkiReviewModal";
import { AddBookModal } from "./components/AddBookModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { BeginnerStoryHero } from "./components/BeginnerStoryHero";
import { BeginnerStoryFooter } from "./components/BeginnerStoryFooter";
import { isBeginnerTrack } from "./utils/beginnerStories";

export function normalizeTrack(track: Partial<Track>): Track {
  const audio = track.audio;
  const text = track.text;
  const transcript = track.transcript;
  const diff =
    track.difficulty && (difficultyOrder as readonly string[]).includes(track.difficulty)
      ? track.difficulty
      : "C1";
  const coll =
    track.collection &&
    collectionOptions.includes(track.collection as (typeof collectionOptions)[number]) &&
    track.collection !== "all"
      ? track.collection
      : "stories";
  return {
    ...track,
    id: track.id || audio || text || transcript || "unknown",
    title: track.title || audio || text || transcript || "Untitled",
    difficulty: diff,
    collection: coll,
    minutes: Number(track.minutes) || 0
  } as Track;
}

export const App: React.FC = () => {
  const [view, setView] = useState<"library" | "reader">("library");
  const [readerMode, setReaderMode] = useState<ReaderMode>("listen");
  const [media, setMedia] = useState<"audio" | "text">("audio");
  const [statusText, setStatusText] = useState<string>(
    "Choose a story from the library or load your own audio and transcript."
  );
  const [passageStatusText, setPassageStatusText] = useState<string>("");

  const [hostedTracks, setHostedTracks] = useState<Track[]>([]);
  const [personalBooks, setPersonalBooks] = useState<Track[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");

  const [words, setWordsState] = useState<WordToken[]>([]);
  const [passages, setPassagesState] = useState<Passage[]>([]);

  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(loadAppearanceSettings);
  const [catalogSettings, setCatalogSettings] = useState<CatalogSettings>(loadCatalogSettings);
  const [progressCache, setProgressCache] = useState<ProgressCache>(loadProgressCache);
  const [studyLog, setStudyLog] = useState<StudyLog>(loadStudyLog);

  const [selectedWord, setSelectedWord] = useState<WordToken | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [sideDefinition, setSideDefinition] = useState<SideDefinition | null>(null);
  const [isLoopingSentence, setIsLoopingSentence] = useState<boolean>(false);
  const loopRangeRef = useRef<{ start: number; end: number } | null>(null);

  const [ankiOpen, setAnkiOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const readerRef = useRef<HTMLElement | null>(null);
  const trackLoadIdRef = useRef<number>(0);
  const objectUrlRef = useRef<string>("");
  const tracksRef = useRef<Track[]>([]);
  tracksRef.current = tracks;
  const activeTrackRef = useRef<Track | null>(null);
  activeTrackRef.current = activeTrack;
  const mediaRef = useRef<"audio" | "text">(media);
  mediaRef.current = media;
  const wordsRef = useRef<WordToken[]>(words);
  wordsRef.current = words;
  const progressCacheRef = useRef<ProgressCache>(progressCache);
  progressCacheRef.current = progressCache;
  const readerModeRef = useRef<ReaderMode>(readerMode);
  readerModeRef.current = readerMode;

  // Passages hook
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const {
    passageIndex,
    passageRevealed,
    setPassageIndex,
    setPassageRevealed,
    movePassage,
    playCurrentPassage,
    seekToPassageStart,
    handlePassagePlayback
  } = usePassages({
    passages,
    audioRef: audioElementRef,
    onStatus: setPassageStatusText
  });
  const passageIndexRef = useRef<number>(passageIndex);
  passageIndexRef.current = passageIndex;

  // 60fps word sync hook
  const { updateCurrentWord, applyWordIndex, resetSyncState } = useWordSync({
    readerRef,
    audioRef: audioElementRef,
    words,
    isPlaying: false, // Synced below via audioPlayer state
    isReadMode: readerMode === "read",
    readerMode,
    passageRevealed,
    renderedWordStartIndex:
      readerMode === "passages" && passages[passageIndex] ? passages[passageIndex].startWordIndex : 0,
    renderedWordEndIndex:
      readerMode === "passages" && passages[passageIndex]
        ? passages[passageIndex].endWordIndex
        : words.length - 1
  });

  // Audio player hook
  const {
    audioRef,
    isPlaying: isAudioPlaying,
    isPaused: isAudioPaused,
    currentTime: audioCurrentTime,
    duration: audioDuration,
    formattedCurrentTime,
    formattedDuration,
    play: audioPlay,
    pause: audioPause,
    seek: audioSeek,
    skipBy: audioSkipBy,
    setAudioSource,
    clearAudioSource,
    setPlaybackRate: setAudioPlaybackRate
  } = useAudioPlayer({
    onTimeUpdate: (time, dur) => {
      if (readerModeRef.current === "passages") {
        handlePassagePlayback(time);
      }
      updateCurrentWord(time, false);
      if (activeTrackRef.current && dur > 0) {
        saveActiveProgress({
          activeTrackId: activeTrackRef.current.id,
          media: "audio",
          audioDuration: dur,
          audioCurrentTime: time,
          audioEnded: false,
          readerMode: readerModeRef.current,
          passageIndex: passageIndexRef.current,
          progressCache: progressCacheRef.current,
          force: false,
          onSaved: setProgressCache
        });
      }
    },
    onPause: () => {
      const audio = audioElementRef.current;
      if (activeTrackRef.current && audio && audio.duration > 0) {
        saveActiveProgress({
          activeTrackId: activeTrackRef.current.id,
          media: "audio",
          audioDuration: audio.duration,
          audioCurrentTime: audio.currentTime,
          audioEnded: audio.ended,
          readerMode: readerModeRef.current,
          passageIndex: passageIndexRef.current,
          progressCache: progressCacheRef.current,
          force: true,
          onSaved: setProgressCache
        });
      }
    },
    onEnded: () => {
      const audio = audioElementRef.current;
      if (activeTrackRef.current && audio && audio.duration > 0) {
        saveActiveProgress({
          activeTrackId: activeTrackRef.current.id,
          media: "audio",
          audioDuration: audio.duration,
          audioCurrentTime: audio.duration,
          audioEnded: true,
          readerMode: readerModeRef.current,
          passageIndex: passageIndexRef.current,
          progressCache: progressCacheRef.current,
          force: true,
          onSaved: setProgressCache
        });
      }
    }
  });

  // Sync audioRef with audioElementRef
  useEffect(() => {
    audioElementRef.current = audioRef.current;
  }, [audioRef]);

  // Keep 60fps RAF running while audio is playing
  useEffect(() => {
    if (!isAudioPlaying || media !== "audio") return;
    let rafId = 0;
    const loop = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const loopRange = loopRangeRef.current;
        if (loopRange && audio.currentTime >= loopRange.end) {
          audio.currentTime = loopRange.start;
        }
        if (readerModeRef.current === "passages") {
          handlePassagePlayback(audio.currentTime);
        }
        updateCurrentWord(audio.currentTime, true);
        rafId = requestAnimationFrame(loop);
      }
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isAudioPlaying, media, audioRef, handlePassagePlayback, updateCurrentWord]);

  // If audio metadata loads for untimed words, assign approximate times
  useEffect(() => {
    if (media === "audio" && audioDuration > 0 && words.length > 0 && !hasValidTimings(words)) {
      const cloned = words.map((w) => ({ ...w }));
      assignApproximateTimes(cloned, audioDuration);
      setWordsState(cloned);
      setPassagesState(buildPassages(cloned));
    }
  }, [audioDuration, media, words]);

  // Browser TTS hook
  const {
    voices: ttsVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    ttsState,
    ttsWordIndex,
    setTtsWordIndex,
    chunks: ttsChunks,
    toggleTextToSpeech,
    speakTextFromWord,
    pauseTextToSpeech,
    stopTextToSpeech,
    restartTextToSpeech,
    seekTextToSpeech,
    moveTtsChunk
  } = useBrowserTts({
    words,
    appearanceSettings,
    onWordChange: (idx, scrollReader) => {
      if (readerModeRef.current === "listen") {
        applyWordIndex(idx, scrollReader);
      }
      if (activeTrackRef.current && wordsRef.current.length > 0) {
        saveActiveProgress({
          activeTrackId: activeTrackRef.current.id,
          media: "text",
          wordCount: wordsRef.current.length,
          wordIndex: idx,
          progressCache: progressCacheRef.current,
          force: false,
          onSaved: setProgressCache
        });
      }
    },
    onStatusChange: setStatusText,
    readerRef
  });
  const ttsWordIndexRef = useRef<number>(ttsWordIndex);
  ttsWordIndexRef.current = ttsWordIndex;

  // Onboarding demo simulation hook
  const {
    isOpen: onboardingOpen,
    state: onboardingState,
    isPlayingDemo,
    demoCurrentTime,
    activeWordIndex: demoActiveWordIndex,
    popoverWord: demoPopoverWord,
    openOnboarding,
    closeOnboarding,
    goToOnboardingStep,
    toggleDemoSimulation,
    showDemoWordPopover,
    hideDemoWordPopover,
    finishOnboarding,
    setState: setOnboardingState
  } = useOnboardingDemo({
    initialAppearance: appearanceSettings,
    initialCatalog: catalogSettings,
    onSave: (newApp, newCat) => {
      setAppearanceSettings(newApp);
      saveAppearanceSettings(newApp);
      applyAppearanceSettings(newApp);
      setCatalogSettings(newCat);
      saveCatalogSettings(newCat);
    }
  });

  // Apply visual settings on change and listen for OS theme change
  useEffect(() => {
    applyAppearanceSettings(appearanceSettings);
    setAudioPlaybackRate(appearanceSettings.playbackRate);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleSystemTheme = () => {
      if (appearanceSettings.theme === "system") {
        applyAppearanceSettings(appearanceSettings);
      }
    };
    mq?.addEventListener?.("change", handleSystemTheme);
    return () => mq?.removeEventListener?.("change", handleSystemTheme);
  }, [appearanceSettings, setAudioPlaybackRate]);

  // Save catalog settings on change
  const handleUpdateCatalogSettings = useCallback(
    (updater: CatalogSettings | ((prev: CatalogSettings) => CatalogSettings)) => {
      setCatalogSettings((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveCatalogSettings(next);
        return next;
      });
    },
    []
  );

  // Sync document.documentElement.dataset.mode
  useEffect(() => {
    document.documentElement.dataset.mode = readerMode === "read" ? "read" : "listen";
  }, [readerMode]);

  // Flush progress on pagehide / visibilitychange
  const flushActiveProgress = useCallback(() => {
    const track = activeTrackRef.current;
    if (!track) return;
    if (mediaRef.current === "text") {
      if (!wordsRef.current.length) return;
      saveActiveProgress({
        activeTrackId: track.id,
        media: "text",
        wordCount: wordsRef.current.length,
        wordIndex: ttsWordIndexRef.current,
        progressCache: progressCacheRef.current,
        force: true,
        onSaved: setProgressCache
      });
    } else {
      const audio = audioElementRef.current;
      if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
      saveActiveProgress({
        activeTrackId: track.id,
        media: "audio",
        audioDuration: audio.duration,
        audioCurrentTime: audio.ended ? audio.duration : audio.currentTime,
        audioEnded: audio.ended,
        readerMode: readerModeRef.current,
        passageIndex: passageIndexRef.current,
        progressCache: progressCacheRef.current,
        force: true,
        onSaved: setProgressCache
      });
    }
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      flushActiveProgress();
      stopTextToSpeech({ preservePosition: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushActiveProgress();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushActiveProgress, stopTextToSpeech]);

  // Combine hosted tracks and personal books
  const refreshTracks = useCallback((hosted: Track[], personal: Track[]) => {
    const combined = [...hosted, ...personal].map(normalizeTrack);
    setTracks(combined);
  }, []);

  const loadLibrary = useCallback(async () => {
    try {
      const response = await fetch("library.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No library");
      const library = await response.json();
      if (!Array.isArray(library)) throw new Error("Invalid library");
      const normalized = library
        .filter((track) => track.audio || track.text || track.transcript)
        .map(normalizeTrack);
      setHostedTracks(normalized);
      return normalized;
    } catch {
      setHostedTracks([]);
      return [];
    }
  }, []);

  const loadPersonalBooks = useCallback(async () => {
    try {
      const books = await readPersonalBooks();
      const normalized = books
        .filter((b) => b?.id && b?.title && b?.customText)
        .map((b) => normalizeTrack({ ...b, personal: true, collection: "my-books" }))
        .sort((a, b) => Date.parse(b.addedAt || "0") - Date.parse(a.addedAt || "0"));
      setPersonalBooks(normalized);
      return normalized;
    } catch {
      setPersonalBooks([]);
      return [];
    }
  }, []);

  const showLibrary = useCallback(
    (updateHistory = true) => {
      audioPause();
      flushActiveProgress();
      stopTextToSpeech({ preservePosition: true });
      setView("library");
      document.title = "Spanish Listening Reader";
      if (updateHistory && location.hash) {
        history.pushState({}, "", `${location.pathname}${location.search}`);
      }
      setSelectedWord(null);
      setAnchorEl(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [audioPause, flushActiveProgress, stopTextToSpeech]
  );

  const showReader = useCallback((trackTitle?: string) => {
    setView("reader");
    document.title = trackTitle ? `${trackTitle} · Spanish Listening Reader` : "Spanish Listening Reader";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Set words and build passages
  const setWords = useCallback(
    (nextWords: WordToken[], precise: boolean, savedWordIndex = 0) => {
      const indexed = nextWords.map((word, index) => ({
        ...word,
        index,
        start: precise ? word.start : Number.NaN,
        end: precise ? word.end : Number.NaN
      }));
      const audio = audioElementRef.current;
      if (!precise && audio && audio.duration && Number.isFinite(audio.duration)) {
        assignApproximateTimes(indexed, audio.duration);
      }
      setWordsState(indexed);
      resetSyncState();

      const built = buildPassages(indexed);
      setPassagesState(built);
      setPassageIndex(-1);
      setTtsWordIndex(savedWordIndex);
      if (savedWordIndex > 0) {
        requestAnimationFrame(() => {
          applyWordIndex(savedWordIndex, false);
        });
      }
    },
    [applyWordIndex, resetSyncState, setPassageIndex, setTtsWordIndex]
  );

  // Ensure word read/current classes stay synced when ReaderText re-renders blocks
  useEffect(() => {
    if (view !== "reader" || readerMode === "read" || !words.length) return;
    if (media === "text") {
      if (ttsWordIndexRef.current > 0 || ttsState !== "idle") {
        applyWordIndex(ttsWordIndexRef.current, false);
      }
    } else {
      const audio = audioElementRef.current;
      const time = audio ? audio.currentTime : audioCurrentTime;
      if (time > 0) {
        updateCurrentWord(time, false);
      }
    }
  }, [
    view,
    readerMode,
    passageRevealed,
    appearanceSettings.translationLayout,
    words,
    media,
    ttsState,
    audioCurrentTime,
    applyWordIndex,
    updateCurrentWord
  ]);

  // Load track
  const loadTrack = useCallback(
    async (track: Track, updateHistory = true) => {
      audioPause();
      flushActiveProgress();
      stopTextToSpeech({ preservePosition: false });
      const loadId = ++trackLoadIdRef.current;
      setActiveTrack(track);
      setCustomTitle("");
      setSelectedWord(null);
      setAnchorEl(null);
      setSideDefinition(null);
      setIsLoopingSentence(false);
      loopRangeRef.current = null;
      const isAudio = Boolean(track.audio);
      setMedia(isAudio ? "audio" : "text");

      const savedProgress = progressCacheRef.current[track.id];
      let pendingTime = savedProgress?.time || 0;
      if (isAudio && savedProgress?.duration && pendingTime / savedProgress.duration >= 0.97) {
        pendingTime = 0;
      }
      const resumeAt = isAudio ? pendingTime : 0;

      updateMediaSession(track);
      showReader(track.title);

      if (updateHistory && location.hash.slice(1) !== encodeURIComponent(track.id)) {
        history.pushState({ trackId: track.id }, "", `#${encodeURIComponent(track.id)}`);
      }

      setReaderMode(isAudio || speechSynthesisSupported ? "listen" : "read");

      if (isAudio) {
        setAudioSource(track.audio!, resumeAt);
        setStatusText(`${track.title} loaded.`);
      } else {
        clearAudioSource();
        updateMediaSession(track);
        setStatusText(`Opening ${track.title}…`);
      }

      if (track.customText) {
        setSavedTranslationBlocks([]);
        const parsed = tokenizeUntimed(track.customText);
        const savedWordIdx =
          savedProgress?.wordCount === parsed.length && Number.isInteger(savedProgress?.wordIndex)
            ? Math.max(0, Math.min(savedProgress.wordIndex!, parsed.length - 1))
            : 0;
        setWords(parsed, false, savedWordIdx);
        const voiceHint = speechSynthesisSupported ? " · browser voice ready" : "";
        setStatusText(
          `${track.title} · ${parsed.length.toLocaleString()} words · about ${
            track.minutes || readingMinutes(parsed.length)
          } min to read${voiceHint}.`
        );
        return;
      }

      const transcriptPath = track.audio ? track.transcript : track.text || track.transcript;
      if (!transcriptPath) {
        setWordsState([]);
        setStatusText(`${track.title} has no transcript yet.`);
        return;
      }

      try {
        const [response, savedBlocks] = await Promise.all([
          fetch(transcriptPath),
          loadSavedTrackTranslation(track)
        ]);
        if (!response.ok) throw new Error("Transcript not found");
        const text = await response.text();
        if (loadId !== trackLoadIdRef.current) return;
        setSavedTranslationBlocks(savedBlocks);
        const parsed = parseTranscript(
          track.text ? stripCatalogTextHeader(text, track) : text,
          transcriptPath
        );
        const precise = Boolean(track.audio) && hasValidTimings(parsed);
        const savedWordIdx =
          !track.audio &&
          savedProgress?.wordCount === parsed.length &&
          Number.isInteger(savedProgress?.wordIndex)
            ? Math.max(0, Math.min(savedProgress.wordIndex!, parsed.length - 1))
            : 0;
        setWords(parsed, precise, savedWordIdx);

        if (track.audio) {
          const resumeMessage = resumeAt > 0 ? ` Resuming at ${formatTime(resumeAt)}.` : "";
          setStatusText(
            `${track.title} loaded with ${parsed.length.toLocaleString()} synced words.${resumeMessage}`
          );
        } else {
          const voiceHint = speechSynthesisSupported ? " · browser voice ready" : "";
          setStatusText(
            `${track.title} · ${parsed.length.toLocaleString()} words · about ${
              track.minutes || readingMinutes(parsed.length)
            } min to read${voiceHint}.`
          );
        }
      } catch {
        if (loadId !== trackLoadIdRef.current) return;
        setStatusText(`${track.title} loaded, but its transcript could not be loaded.`);
      }
    },
    [audioPause, clearAudioSource, flushActiveProgress, setAudioSource, setWords, showReader, stopTextToSpeech]
  );

  // Initialize once on mount
  const loadTrackRef = useRef(loadTrack);
  loadTrackRef.current = loadTrack;
  const showLibraryRef = useRef(showLibrary);
  showLibraryRef.current = showLibrary;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [hosted, personal] = await Promise.all([
        loadLibrary(),
        loadPersonalBooks(),
        loadSharedGlossary()
      ]);
      if (!mounted) return;
      const combined = [...hosted, ...personal].map(normalizeTrack);
      setTracks(combined);

      const routeId = safeDecodeHash();
      const routeTrack = combined.find((t) => t.id === routeId);
      if (routeTrack) {
        await loadTrackRef.current(routeTrack, false);
      }
    })();

    const handlePopState = () => {
      const hash = safeDecodeHash();
      if (!hash) {
        showLibraryRef.current(false);
      } else {
        const found = tracksRef.current.find((t) => t.id === hash);
        if (found) loadTrackRef.current(found, false);
        else showLibraryRef.current(false);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      mounted = false;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loadLibrary, loadPersonalBooks]);

  // Mode switching
  const handleSelectReaderMode = useCallback(
    (mode: ReaderMode) => {
      if (mode === "passages" && (media === "text" || !audioRef.current?.src || !passages.length)) {
        setStatusText("Passages need a synced transcript for this audio, so they are unavailable here.");
        return;
      }
      if (media === "text" && mode === "read" && ttsState === "playing") {
        pauseTextToSpeech();
      }
      setReaderMode(mode);
      if (mode === "read") {
        readerRef.current?.classList.remove("has-reading-position");
      }
      if (mode === "passages") {
        audioPause();
        setSelectedWord(null);
        setAnchorEl(null);
        const savedPassageIdx = activeTrack
          ? progressCacheRef.current[activeTrack.id]?.passageIndex
          : undefined;
        let idx =
          typeof savedPassageIdx === "number" && savedPassageIdx >= 0 && savedPassageIdx < passages.length
            ? savedPassageIdx
            : findPassageAt(passages, audioCurrentTime);
        if (idx < 0) idx = 0;
        setPassageIndex(idx);
        const passage = passages[idx];
        if (passage && audioDuration > 0) {
          audioSeek(Math.min(passage.startTime, audioDuration - 0.01));
        }
      } else if (media === "text" && mode === "listen" && words.length > 0) {
        if (ttsWordIndex > 0) {
          applyWordIndex(ttsWordIndex, false);
        }
        if (!speechSynthesisSupported) {
          setStatusText(
            "Browser text-to-speech is unavailable here. You can still read and use the vocabulary tools."
          );
        }
      }
    },
    [
      activeTrack,
      applyWordIndex,
      audioCurrentTime,
      audioDuration,
      audioPause,
      audioRef,
      audioSeek,
      media,
      passages,
      pauseTextToSpeech,
      setPassageIndex,
      ttsState,
      ttsWordIndex,
      words.length
    ]
  );

  // Play/Pause unified handler
  const handleTogglePlay = useCallback(() => {
    if (media === "text") {
      if (readerMode !== "listen") setReaderMode("listen");
      toggleTextToSpeech();
      return;
    }
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      if (readerMode === "passages") seekToPassageStart();
      audioPlay();
    } else {
      audioPause();
    }
  }, [audioPause, audioPlay, audioRef, media, readerMode, seekToPassageStart, toggleTextToSpeech]);

  const handleSkipBack = useCallback(() => {
    if (media === "text") {
      moveTtsChunk(-1);
      return;
    }
    if (readerMode === "passages") {
      movePassage(-1, true);
      return;
    }
    audioSkipBy(-10);
  }, [audioSkipBy, media, movePassage, moveTtsChunk, readerMode]);

  const handleSkipForward = useCallback(() => {
    if (media === "text") {
      moveTtsChunk(1);
      return;
    }
    if (readerMode === "passages") {
      movePassage(1, true);
      return;
    }
    audioSkipBy(10);
  }, [audioSkipBy, media, movePassage, moveTtsChunk, readerMode]);

  const handleToggleLoopSentence = useCallback(() => {
    if (media !== "audio" || !words.length) return;
    if (isLoopingSentence) {
      setIsLoopingSentence(false);
      loopRangeRef.current = null;
      setStatusText("Stopped repeating current sentence.");
      return;
    }
    const audio = audioRef.current;
    const currentTime = audio ? audio.currentTime : audioCurrentTime;
    let activeIdx = findWordAt(words, currentTime);
    if (activeIdx < 0) {
      activeIdx = Math.max(0, Math.min(countEndedWords(words, currentTime), words.length - 1));
    }
    let startIdx = activeIdx;
    while (startIdx > 0) {
      const prev = words[startIdx - 1];
      if (/[.!?…]["')\]»”]*\s*$/u.test(`${prev.text}${prev.separator || ""}`)) break;
      startIdx -= 1;
    }
    let endIdx = activeIdx;
    while (endIdx < words.length - 1) {
      const curr = words[endIdx];
      if (/[.!?…]["')\]»”]*\s*$/u.test(`${curr.text}${curr.separator || ""}`)) break;
      endIdx += 1;
    }
    const startTime = Number.isFinite(words[startIdx]?.start) ? Math.max(0, words[startIdx].start - 0.08) : currentTime;
    const endTime = Number.isFinite(words[endIdx]?.end)
      ? Math.max(startTime + 0.6, words[endIdx].end + 0.12)
      : startTime + 4;
    loopRangeRef.current = { start: startTime, end: endTime };
    setIsLoopingSentence(true);
    setStatusText("Repeating current sentence (press L to stop).");
    if (audio && audio.paused) {
      audio.currentTime = startTime;
      audioPlay();
    }
  }, [audioCurrentTime, audioPlay, audioRef, isLoopingSentence, media, words]);

  // Keyboard shortcuts in reader view
  useEffect(() => {
    if (view !== "reader") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "BUTTON" ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (readerMode === "passages") {
        const key = event.key.toLowerCase();
        if (key === "arrowleft" || key === "p") {
          event.preventDefault();
          movePassage(-1, true);
          return;
        }
        if (key === "arrowright" || key === "n") {
          event.preventDefault();
          movePassage(1, true);
          return;
        }
        if (key === "r") {
          event.preventDefault();
          setPassageRevealed(false);
          playCurrentPassage();
          return;
        }
        if (key === "t") {
          event.preventDefault();
          setPassageRevealed(!passageRevealed);
          return;
        }
      }

      if (event.key.toLowerCase() === "l" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        handleToggleLoopSentence();
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          handleSkipBack();
          break;
        case "ArrowRight":
          event.preventDefault();
          handleSkipForward();
          break;
        case " ":
          if (media === "text" && readerMode !== "listen") return;
          event.preventDefault();
          handleTogglePlay();
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    handleSkipBack,
    handleSkipForward,
    handleToggleLoopSentence,
    handleTogglePlay,
    media,
    movePassage,
    passageRevealed,
    playCurrentPassage,
    readerMode,
    setPassageRevealed,
    view
  ]);

  // Wire navigator.mediaSession action handlers
  useEffect(() => {
    const ms = "mediaSession" in navigator ? navigator.mediaSession : null;
    if (!ms) return;
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => handleTogglePlay(),
      pause: () => {
        if (media === "text") pauseTextToSpeech();
        else audioPause();
      },
      stop: () => {
        if (media === "text") stopTextToSpeech({ preservePosition: true });
        else audioPause();
      },
      seekbackward: () => handleSkipBack(),
      seekforward: () => handleSkipForward(),
      seekto: (details) => {
        if (media === "audio" && typeof details.seekTime === "number" && Number.isFinite(details.seekTime)) {
          audioSeek(details.seekTime);
        }
      }
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        ms.setActionHandler(action as MediaSessionAction, handler || null);
      } catch {
        // Ignore unsupported media session actions
      }
    }
  }, [
    audioPause,
    audioSeek,
    handleSkipBack,
    handleSkipForward,
    handleTogglePlay,
    media,
    pauseTextToSpeech,
    stopTextToSpeech
  ]);

  // Play from word index
  const handlePlayFromHere = (wordIndex: number) => {
    if (media === "text") {
      if (readerMode !== "listen") setReaderMode("listen");
      speakTextFromWord(wordIndex);
    } else {
      const word = words[wordIndex];
      if (word && Number.isFinite(word.start)) {
        audioSeek(word.start);
        if (readerMode !== "listen") setReaderMode("listen");
        audioPlay();
      }
    }
  };

  // Manual file / text import handlers
  const handleManualAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    audioPause();
    flushActiveProgress();
    stopTextToSpeech({ preservePosition: true });
    trackLoadIdRef.current += 1;
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setActiveTrack(null);
    setCustomTitle(file.name);
    setMedia("audio");
    setReaderMode("listen");
    setSavedTranslationBlocks([]);
    setWordsState([]);
    setPassagesState([]);
    setPassageIndex(-1);
    updateMediaSession(
      normalizeTrack({ id: file.name, title: file.name, author: "", cover: "" })
    );
    showReader(file.name);
    setAudioSource(url, 0);
    setStatusText(`${file.name} loaded.`);
  };

  const handleManualTranscriptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatusText(`Reading ${file.name}…`);
      const parsedFile = await parseUploadedFile(file);
      if (!parsedFile.text || !parsedFile.text.trim()) {
        setStatusText(`Could not extract readable text from ${file.name}.`);
        return;
      }
      const rawText = parsedFile.text.trim();
      const parsedWords = parseTranscript(rawText, file.name);
      const isPrecise = hasValidTimings(parsedWords);
      setSavedTranslationBlocks([]);
      setWords(parsedWords, isPrecise);

      // Persistently save the uploaded book so user never loses it
      const bookTitle = parsedFile.title || titleFromFilename(file.name);
      const newBook = {
        id: createPersonalBookId(),
        title: bookTitle,
        author: parsedFile.author || "",
        difficulty: "B2",
        collection: "my-books",
        description: `Imported ${parsedFile.format || "file"}`,
        customText: rawText,
        wordCount: parsedWords.length,
        minutes: readingMinutes(parsedWords.length),
        personal: true,
        addedAt: new Date().toISOString()
      };
      await savePersonalBook(newBook);
      const normalized = normalizeTrack({ ...newBook, personal: true, collection: "my-books" });
      setPersonalBooks((prev) => {
        const next = [normalized, ...prev.filter((b) => b.id !== normalized.id)];
        refreshTracks(hostedTracks, next);
        return next;
      });
      setActiveTrack(normalized);
      setCustomTitle(normalized.title);
      showReader(normalized.title);
      setStatusText(`${newBook.title} saved to My books (${parsedWords.length.toLocaleString()} words).`);
    } catch {
      setStatusText(`${file.name} could not be read. Check that it is a valid book or transcript file.`);
    }
  };

  const handleUsePastedText = async () => {
    const text = pastedText.trim();
    if (!text) {
      setStatusText("Paste Spanish text first.");
      return;
    }
    const parsed = tokenizeUntimed(text);
    if (!parsed.length) {
      setStatusText("The text needs at least one readable word.");
      return;
    }
    setSavedTranslationBlocks([]);
    setWords(parsed, false);

    const firstLine = text.split("\n")[0].slice(0, 48).trim();
    const newBook = {
      id: createPersonalBookId(),
      title: firstLine || "Pasted reading",
      author: "",
      difficulty: "B2",
      collection: "my-books",
      description: "Pasted text saved to My books",
      customText: text,
      wordCount: parsed.length,
      minutes: readingMinutes(parsed.length),
      personal: true,
      addedAt: new Date().toISOString()
    };
    await savePersonalBook(newBook);
    const normalized = normalizeTrack({ ...newBook, personal: true, collection: "my-books" });
    setPersonalBooks((prev) => {
      const next = [normalized, ...prev.filter((b) => b.id !== normalized.id)];
      refreshTracks(hostedTracks, next);
      return next;
    });
    setActiveTrack(normalized);
    setCustomTitle(normalized.title);
    showReader(normalized.title);
    setStatusText(`${newBook.title} saved to My books with ${parsed.length.toLocaleString()} words.`);
  };

  // Remove personal book
  const handleRemovePersonalBook = async (track: Track) => {
    if (!window.confirm(`Remove “${track.title}” from My books?`)) return;
    try {
      await deletePersonalBook(track.id);
      const updatedPersonal = personalBooks.filter((b) => b.id !== track.id);
      setPersonalBooks(updatedPersonal);
      refreshTracks(hostedTracks, updatedPersonal);
      const nextProgress = { ...progressCache };
      delete nextProgress[track.id];
      setProgressCache(nextProgress);
      saveProgressCache(nextProgress);
      if (activeTrack?.id === track.id) {
        setActiveTrack(null);
        clearAudioSource();
        showLibrary();
      }
    } catch {
      window.alert("The book could not be removed. Try again.");
    }
  };

  const handleLogWord = (word: WordToken, meaning: string) => {
    const updated = logStudiedWord(word, meaning, words, activeTrack?.title || customTitle || "", studyLog);
    setStudyLog(updated);
  };

  const handleUnlogWord = (word: WordToken) => {
    const normalizedKey = normalizeWord(word.text);
    if (!normalizedKey) return;
    setStudyLog((prev) => {
      const next = { ...prev };
      delete next[normalizedKey];
      saveStudyLog(next);
      return next;
    });
  };

  const studyCardCount = Object.keys(studyLog).length;
  const isAudioMedia = media === "audio";
  const visibleTracks = getVisibleTracks(tracks, catalogSettings);

  const progressPercent = isAudioMedia
    ? audioDuration > 0
      ? (audioCurrentTime / audioDuration) * 100
      : 0
    : words.length > 0
      ? (ttsWordIndex / Math.max(1, words.length - 1)) * 100
      : 0;

  const currentStoryTitle = activeTrack?.title || customTitle || "";
  const storyStudiedWords = Object.entries(studyLog)
    .filter(([, entry]) => currentStoryTitle && entry.reading === currentStoryTitle)
    .sort(([, a], [, b]) => Date.parse(b.lastSeenAt || "0") - Date.parse(a.lastSeenAt || "0"));

  return (
    <div
      className="app"
      data-view={view}
      data-mode={readerMode === "read" ? "read" : "listen"}
      data-media={media}
      data-reader-mode={readerMode}
      data-translation-layout={appearanceSettings.translationLayout}
    >
      {/* Hidden audio element */}
      <audio id="audio" ref={audioRef} preload="metadata" />

      {/* 1. LIBRARY VIEW */}
      {view === "library" && (
        <section className="library-panel screen" aria-labelledby="library-title">
          <TopBar
            studyCardCount={studyCardCount}
            onOpenAnkiReview={() => setAnkiOpen(true)}
            onOpenAddBook={() => setAddBookOpen(true)}
            onOpenOnboarding={() => openOnboarding(1)}
          />

          <CatalogControls
            settings={catalogSettings}
            totalCount={tracks.length}
            filteredCount={visibleTracks.length}
            onUpdateSettings={handleUpdateCatalogSettings}
          />

          <TrackList
            tracks={tracks}
            personalBooks={personalBooks}
            activeTrackId={activeTrack?.id || ""}
            catalogSettings={catalogSettings}
            progressCache={progressCache}
            onSelectTrack={(t) => loadTrack(t, true)}
            onDeletePersonalBook={handleRemovePersonalBook}
            onOpenAddBook={() => setAddBookOpen(true)}
            onClearFilters={() =>
              handleUpdateCatalogSettings({
                search: "",
                format: "all",
                sort: "difficulty",
                level: "all",
                collection: "all"
              })
            }
          />
        </section>
      )}

      {/* 2. READER VIEW */}
      {view === "reader" && (
        <section className="reader-view screen" aria-labelledby="app-title">
          <ReaderTopBar
            track={activeTrack}
            customTitle={customTitle}
            readerMode={readerMode}
            passagesAvailable={Boolean(isAudioMedia && passages.length)}
            isTextOnly={!isAudioMedia}
            appearanceSettings={appearanceSettings}
            progressPercent={progressPercent}
            onBackToLibrary={() => showLibrary(true)}
            onSelectReaderMode={handleSelectReaderMode}
            onUpdateAppearance={(updater) => {
              setAppearanceSettings((prev) => {
                const next = updater(prev);
                saveAppearanceSettings(next);
                return next;
              });
            }}
            onOpenOnboarding={() => openOnboarding(1)}
          />

          <PlayerBar
            media={media}
            isPlaying={isAudioMedia ? isAudioPlaying : ttsState === "playing"}
            isPaused={isAudioMedia ? isAudioPaused : ttsState === "paused"}
            currentTime={isAudioMedia ? audioCurrentTime : ttsWordIndex}
            duration={isAudioMedia ? audioDuration : words.length}
            formattedCurrentTime={formattedCurrentTime}
            formattedDuration={formattedDuration}
            ttsWordIndex={ttsWordIndex}
            wordCount={words.length}
            ttsChunkCount={ttsChunks.length}
            ttsVoices={ttsVoices}
            selectedVoiceURI={selectedVoiceURI}
            playbackRate={appearanceSettings.playbackRate}
            studyCardCount={studyCardCount}
            disabled={isAudioMedia ? !audioDuration : !speechSynthesisSupported || !words.length}
            isLoopingSentence={isLoopingSentence}
            onTogglePlay={handleTogglePlay}
            onSeek={(val) => {
              if (isAudioMedia) {
                audioSeek(val);
                updateCurrentWord(val, true);
                if (activeTrack && audioDuration > 0) {
                  saveActiveProgress({
                    activeTrackId: activeTrack.id,
                    media: "audio",
                    audioDuration,
                    audioCurrentTime: val,
                    audioEnded: false,
                    readerMode,
                    passageIndex,
                    progressCache,
                    force: true,
                    onSaved: setProgressCache
                  });
                }
              } else {
                seekTextToSpeech(val);
                if (readerMode === "listen") {
                  applyWordIndex(val, true);
                }
                if (activeTrack && words.length > 0) {
                  saveActiveProgress({
                    activeTrackId: activeTrack.id,
                    media: "text",
                    wordCount: words.length,
                    wordIndex: val,
                    progressCache,
                    force: true,
                    onSaved: setProgressCache
                  });
                }
              }
            }}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onToggleLoopSentence={handleToggleLoopSentence}
            onSetPlaybackRate={(r) => {
              setAudioPlaybackRate(r);
              setAppearanceSettings((prev) => {
                const next = { ...prev, playbackRate: r };
                saveAppearanceSettings(next);
                return next;
              });
              if (!isAudioMedia) {
                if (ttsState === "playing") restartTextToSpeech(true);
                else if (ttsState === "paused") restartTextToSpeech(false);
              }
            }}
            onSelectVoice={(vURI) => {
              setSelectedVoiceURI(vURI);
              setAppearanceSettings((prev) => {
                const next = { ...prev, ttsVoiceURI: vURI };
                saveAppearanceSettings(next);
                return next;
              });
              if (!isAudioMedia) {
                if (ttsState === "playing") restartTextToSpeech(true);
                else if (ttsState === "paused") restartTextToSpeech(false);
              }
            }}
            onOpenAnkiReview={() => setAnkiOpen(true)}
          />

          <section className="workspace">
            <section className="reader-shell" aria-label="Transcript reader">
              <div id="status" className="status" role="status" aria-live="polite">
                {statusText}
              </div>

              {/* Reading metadata facts */}
              {activeTrack &&
                (isBeginnerTrack(activeTrack) ? (
                  <BeginnerStoryHero track={activeTrack} wordCount={words.length} />
                ) : (
                  <div id="readingMeta" className="reading-meta">
                    <div className="reading-facts">
                      {activeTrack.difficulty && <span>{activeTrack.difficulty}</span>}
                      {activeTrack.author && <span>{activeTrack.author}</span>}
                      {activeTrack.genre && <span>{activeTrack.genre}</span>}
                      {activeTrack.minutes ? <span>{activeTrack.minutes} min</span> : null}
                    </div>
                    {activeTrack.difficultyNote && <p>{activeTrack.difficultyNote}</p>}
                    {String(activeTrack.source || "").startsWith("https://") && (
                      <a
                        href={activeTrack.source}
                        target="_blank"
                        rel="noreferrer"
                        title={activeTrack.rights || "Source edition"}
                      >
                        Source &amp; rights
                      </a>
                    )}
                  </div>
                ))}

              {/* Passages mode practice header */}
              {readerMode === "passages" && (
                <PassagePractice
                  passageIndex={passageIndex}
                  totalPassages={passages.length}
                  passageRevealed={passageRevealed}
                  passageStatusText={passageStatusText}
                  onToggleReveal={() => {
                    const next = !passageRevealed;
                    setPassageRevealed(next);
                    if (next) updateCurrentWord(audioCurrentTime, false);
                  }}
                  onReplay={() => {
                    setPassageRevealed(false);
                    playCurrentPassage();
                  }}
                  onPrevious={() => movePassage(-1, true)}
                  onNext={() => movePassage(1, true)}
                />
              )}

              {/* Vocabulary warmup */}
              {readerMode !== "passages" && (
                <VocabWarmup
                  words={words}
                  appearanceSettings={appearanceSettings}
                  studyLog={studyLog}
                  onSaveWord={handleLogWord}
                  onStartReading={() => {
                    if (media === "text" && speechSynthesisSupported) {
                      if (readerMode !== "listen") setReaderMode("listen");
                      toggleTextToSpeech();
                      return;
                    }
                    if (isAudioMedia && audioRef.current?.src) {
                      if (readerMode !== "listen") setReaderMode("listen");
                      audioPlay();
                      return;
                    }
                    readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    (readerRef.current?.querySelector(".word") as HTMLElement | null)?.focus({
                      preventScroll: true
                    });
                  }}
                />
              )}

              {/* Reader text */}
              <ReaderText
                words={words}
                readerRef={readerRef}
                readerMode={readerMode}
                passage={readerMode === "passages" && passageIndex >= 0 ? passages[passageIndex] : null}
                passageRevealed={passageRevealed}
                appearanceSettings={appearanceSettings}
                activeTrack={activeTrack}
                activeWordIndex={isAudioMedia ? findWordAt(words, audioCurrentTime) : ttsWordIndex}
                onWordClick={(word, btn) => {
                  setSelectedWord(word);
                  setAnchorEl(btn);
                }}
              />

              {/* Beginner story interactive recap & next story card */}
              {activeTrack && isBeginnerTrack(activeTrack) && readerMode !== "passages" && (
                <BeginnerStoryFooter
                  track={activeTrack}
                  allTracks={tracks}
                  onSelectTrack={(nextTrack) => {
                    loadTrack(nextTrack, true);
                  }}
                />
              )}
            </section>

            <aside className="side-panel" aria-label="Word meaning and import tools">
              <div id="definition" className="definition" role="region" aria-live="polite">
                {sideDefinition ? (
                  <>
                    <div className="side-definition-header">
                      <strong dangerouslySetInnerHTML={{ __html: sideDefinition.wordHtml }} />
                      {speechSynthesisSupported && (
                        <button
                          type="button"
                          className="side-pronounce-btn"
                          onClick={() => pronounceSpanishWord(sideDefinition.wordText, selectedVoiceURI)}
                          aria-label={`Pronounce ${sideDefinition.wordText}`}
                          title="Listen to Spanish pronunciation"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          </svg>
                          Listen
                        </button>
                      )}
                    </div>
                    <p dangerouslySetInnerHTML={{ __html: sideDefinition.meaningHtml }} />
                  </>
                ) : (
                  <p className="muted">
                    {readerMode === "passages" && !passageRevealed
                      ? "Reveal the passage, then tap a word for its meaning."
                      : "Tap a word for an English meaning."}
                  </p>
                )}
              </div>

              {storyStudiedWords.length > 0 && (
                <div className="story-vocab-history" aria-label="Words looked up in this reading">
                  <div className="story-vocab-header">
                    <span className="story-vocab-title">Saved in this reading ({storyStudiedWords.length})</span>
                    <button
                      type="button"
                      className="text-link-button"
                      onClick={() => setAnkiOpen(true)}
                    >
                      Practice
                    </button>
                  </div>
                  <ul className="story-vocab-list">
                    {storyStudiedWords.slice(0, 8).map(([key, item]) => (
                      <li key={key} className="story-vocab-item">
                        <button
                          type="button"
                          className="story-vocab-word-btn"
                          onClick={() => {
                            if (speechSynthesisSupported) {
                              pronounceSpanishWord(item.word, selectedVoiceURI);
                            }
                            setSideDefinition({
                              wordText: item.word,
                              wordIndex: 0,
                              wordHtml: escapeHtml(item.word),
                              meaningHtml: item.context
                                ? `${escapeHtml(item.meaning)}<br><small class="muted">${escapeHtml(item.context)}</small>`
                                : escapeHtml(item.meaning)
                            });
                          }}
                          title="Click to pronounce and view context"
                        >
                          <span className="story-vocab-es">{item.word}</span>
                          <span className="story-vocab-en">{item.meaning}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="manual-tools">
                <summary>Use your own files</summary>
                <div className="manual-body">
                  <label className="file-control">
                    <span>Audio</span>
                    <input
                      id="audioFile"
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.ogg"
                      onChange={handleManualAudioFile}
                    />
                  </label>
                  <label className="file-control">
                    <span>Book or transcript</span>
                    <input
                      id="transcriptFile"
                      type="file"
                      accept=".txt,.text,.md,.markdown,.epub,.pdf,.html,.htm,.xhtml,.fb2,.rtf,.json,.vtt,.srt,application/epub+zip,application/pdf,text/plain,text/markdown,text/html,application/rtf,text/rtf"
                      onChange={handleManualTranscriptFile}
                    />
                  </label>
                  <label className="paste-control" htmlFor="pasteTranscript">
                    <span>Or paste Spanish text</span>
                    <textarea
                      id="pasteTranscript"
                      rows={4}
                      placeholder="Pega aquí el texto si todavía no tienes marcas de tiempo..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                  </label>
                  <button
                    id="usePastedText"
                    className="secondary-button"
                    type="button"
                    onClick={handleUsePastedText}
                  >
                    Use pasted text
                  </button>
                </div>
              </details>
            </aside>
          </section>

          {/* Word Popover */}
          <WordPopover
            selectedWord={selectedWord}
            anchorEl={anchorEl}
            words={words}
            media={media}
            studyLog={studyLog}
            preferredVoiceURI={selectedVoiceURI}
            onClose={() => {
              setSelectedWord(null);
              setAnchorEl(null);
            }}
            onPlayFromHere={handlePlayFromHere}
            onLogWord={handleLogWord}
            onUnlogWord={handleUnlogWord}
            onUpdateSideDefinition={setSideDefinition}
          />
        </section>
      )}

      {/* Modals & Dialogs */}
      <AnkiReviewModal
        isOpen={ankiOpen}
        studyLog={studyLog}
        preferredVoiceURI={selectedVoiceURI}
        onClose={() => setAnkiOpen(false)}
        onUpdateEntry={(key, field, val) => {
          setStudyLog((prev) => {
            const next = {
              ...prev,
              [key]: { ...prev[key], [field]: val, lastSeenAt: new Date().toISOString() }
            };
            saveStudyLog(next);
            return next;
          });
        }}
        onRemoveEntry={(key: string) => {
          setStudyLog((prev) => {
            const next = { ...prev };
            delete next[key];
            saveStudyLog(next);
            if (Object.keys(next).length === 0) {
              setAnkiOpen(false);
            }
            return next;
          });
        }}
      />

      <AddBookModal
        isOpen={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        onBookAdded={(book) => {
          const normalized = normalizeTrack({ ...book, personal: true, collection: "my-books" });
          const nextPersonal = [normalized, ...personalBooks];
          setPersonalBooks(nextPersonal);
          refreshTracks(hostedTracks, nextPersonal);
          handleUpdateCatalogSettings({ ...catalogSettings, collection: "my-books" });
        }}
      />

      <OnboardingModal
        isOpen={onboardingOpen}
        state={onboardingState}
        isPlayingDemo={isPlayingDemo}
        demoCurrentTime={demoCurrentTime}
        activeWordIndex={demoActiveWordIndex}
        popoverWord={demoPopoverWord}
        onClose={closeOnboarding}
        onGoToStep={goToOnboardingStep}
        onTogglePlayDemo={toggleDemoSimulation}
        onWordClick={showDemoWordPopover}
        onHidePopover={hideDemoWordPopover}
        onFinish={finishOnboarding}
        onUpdateState={setOnboardingState}
      />
    </div>
  );
};
