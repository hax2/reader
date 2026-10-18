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
  loadCatalogSettings,
  saveCatalogSettings,
  loadProgressCache,
  saveActiveProgress,
  loadStudyLog,
  saveStudyLog,
  logStudiedWord,
  readPersonalBooks,
  deletePersonalBook
} from "./utils/storage";
import {
  safeDecodeHash,
  readingMinutes
} from "./utils/text";
import {
  parseTranscript,
  stripCatalogTextHeader,
  tokenizeUntimed,
  wordsFromSegment,
  parseJsonTranscript,
  parseCueTranscript
} from "./utils/tokenization";
import {
  loadSavedTrackTranslation,
  setSavedTranslationBlocks
} from "./utils/translations";
import {
  loadSharedGlossary
} from "./utils/vocab";
import {
  buildPassages,
  passageBoundaryScore,
  createPassage,
  findPassageAt
} from "./utils/passages";
import { updateMediaSession } from "./utils/mediaSession";
import { speechSynthesisSupported } from "./utils/constants";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useBrowserTts } from "./hooks/useBrowserTts";
import { useWordSync } from "./hooks/useWordSync";
import { usePassages } from "./hooks/usePassages";
import { useOnboardingDemo } from "./hooks/useOnboardingDemo";
import { TopBar } from "./components/TopBar";
import { CatalogControls } from "./components/CatalogControls";
import { TrackList } from "./components/TrackList";
import { ReaderTopBar } from "./components/ReaderTopBar";
import { ReaderText } from "./components/ReaderText";
import { PlayerBar } from "./components/PlayerBar";
import { PassagePractice } from "./components/PassagePractice";
import { VocabWarmup } from "./components/VocabWarmup";
import { WordPopover } from "./components/WordPopover";
import { AppearanceModal } from "./components/AppearanceModal";
import { AnkiReviewModal } from "./components/AnkiReviewModal";
import { AddBookModal } from "./components/AddBookModal";
import { OnboardingModal } from "./components/OnboardingModal";

export function normalizeTrack(track: Partial<Track>): Track {
  const audio = track.audio;
  const text = track.text;
  const transcript = track.transcript;
  return {
    ...track,
    id: track.id || audio || text || transcript || "unknown",
    title: track.title || audio || text || transcript || "Untitled",
    difficulty: track.difficulty || "C1",
    collection: track.collection && track.collection !== "all" ? track.collection : "stories",
    minutes: Number(track.minutes) || 0
  } as Track;
}

export async function initialize(
  loadLib: () => Promise<Track[]>,
  loadPersonal: () => Promise<Track[]>,
  loadGlossary: () => Promise<Record<string, string>>,
  onTrackFound?: (track: Track) => Promise<void>
): Promise<Track[]> {
  const [hosted, personal] = await Promise.all([loadLib(), loadPersonal(), loadGlossary()]);
  const combined = [...hosted, ...personal].map(normalizeTrack);
  const routeId = safeDecodeHash();
  const routeTrack = combined.find((t) => t.id === routeId);
  if (routeTrack && onTrackFound) {
    await onTrackFound(routeTrack);
  }
  return combined;
}

export async function removePersonalBook(
  track: Track,
  onDeleted: (id: string) => void
): Promise<void> {
  if (typeof window !== "undefined" && !window.confirm(`Remove “${track.title}” from My books?`)) return;
  await deletePersonalBook(track.id);
  onDeleted(track.id);
}

export function setReadMode(enabled: boolean, onSetMode: (mode: ReaderMode) => void): void {
  onSetMode(enabled ? "read" : "listen");
}

export function syncModeSelector(readerMode: ReaderMode, buttons?: HTMLElement[]): void {
  buttons?.forEach((btn) => {
    const active = btn.dataset.readerMode === readerMode;
    btn.setAttribute("aria-checked", String(active));
    btn.tabIndex = active ? 0 : -1;
  });
}

export function enterPassagesMode(
  passages: Passage[],
  currentTime: number,
  onSetPassageIndex: (idx: number) => void
): void {
  const idx = findPassageAt(passages, currentTime);
  onSetPassageIndex(idx >= 0 ? idx : 0);
}

export function exitPassagesMode(onSetPassageIndex: (idx: number) => void): void {
  onSetPassageIndex(-1);
}

export function renderReaderForCurrentMode(
  readerMode: ReaderMode,
  passage: Passage | null,
  passageRevealed: boolean
): { isHidden: boolean; passage: Passage | null } {
  return {
    isHidden: readerMode === "passages" && !passageRevealed,
    passage: readerMode === "passages" ? passage : null
  };
}

export function renderReadingMeta(track: Track | null): React.ReactElement | null {
  if (!track) return null;
  return (
    <div className="reading-meta">
      <div className="reading-facts">
        {track.difficulty && <span>{track.difficulty}</span>}
        {track.author && <span>{track.author}</span>}
        {(track as { genre?: string }).genre && <span>{(track as { genre?: string }).genre}</span>}
        {track.minutes ? <span>{track.minutes} min</span> : null}
      </div>
    </div>
  );
}

export function status(message: string, onStatus?: (msg: string) => void): void {
  onStatus?.(message);
}

export const App: React.FC = () => {
  const [view, setView] = useState<"library" | "reader">("library");
  const [readerMode, setReaderMode] = useState<ReaderMode>("listen");
  const [media, setMedia] = useState<"audio" | "text">("audio");
  const [statusText, setStatusText] = useState<string>("");

  const [hostedTracks, setHostedTracks] = useState<Track[]>([]);
  const [personalBooks, setPersonalBooks] = useState<Track[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);

  const [words, setWordsState] = useState<WordToken[]>([]);
  const [passages, setPassagesState] = useState<Passage[]>([]);

  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>(loadAppearanceSettings);
  const [catalogSettings, setCatalogSettings] = useState<CatalogSettings>(loadCatalogSettings);
  const [progressCache, setProgressCache] = useState<ProgressCache>(loadProgressCache);
  const [studyLog, setStudyLog] = useState<StudyLog>(loadStudyLog);

  const [selectedWord, setSelectedWord] = useState<WordToken | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [ankiOpen, setAnkiOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);

  const readerRef = useRef<HTMLElement | null>(null);
  const trackLoadIdRef = useRef<number>(0);

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
    togglePlay: audioTogglePlay,
    seek: audioSeek,
    skipBy: audioSkipBy,
    setAudioSource,
    clearAudioSource,
    setPlaybackRate: setAudioPlaybackRate
  } = useAudioPlayer({
    onTimeUpdate: (time) => {
      if (readerMode === "passages") {
        handlePassagePlayback(time);
      }
    },
    onEnded: () => {
      if (activeTrack) {
        saveActiveProgress({
          activeTrackId: activeTrack.id,
          media: "audio",
          audioDuration,
          audioCurrentTime: audioDuration,
          audioEnded: true,
          progressCache,
          force: true,
          onSaved: setProgressCache
        });
      }
    }
  });

  // Passages hook
  const {
    passageIndex,
    passageRevealed,
    setPassageIndex,
    setPassageRevealed,
    movePassage,
    playCurrentPassage,
    handlePassagePlayback
  } = usePassages({
    passages,
    audioRef,
    onStatus: setStatusText
  });

  // 60fps word sync hook
  const { updateCurrentWord, resetSyncState } = useWordSync({
    readerRef,
    audioRef,
    words,
    isPlaying: isAudioPlaying,
    isReadMode: readerMode === "read",
    readerMode,
    passageRevealed,
    renderedWordStartIndex: readerMode === "passages" && passages[passageIndex] ? passages[passageIndex].startWordIndex : 0,
    renderedWordEndIndex: readerMode === "passages" && passages[passageIndex] ? passages[passageIndex].endWordIndex : words.length - 1
  });

  // Browser TTS hook
  const {
    voices: ttsVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    ttsState,
    ttsWordIndex,
    toggleTextToSpeech,
    speakTextFromWord,
    pauseTextToSpeech,
    stopTextToSpeech,
    restartTextToSpeech,
    seekTextToSpeech,
    moveTtsChunk,
    setTtsWord
  } = useBrowserTts({
    words,
    appearanceSettings,
    onWordChange: (idx) => updateCurrentWord(idx, true),
    onStatusChange: setStatusText,
    readerRef
  });

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

  // Apply visual settings on change
  useEffect(() => {
    applyAppearanceSettings(appearanceSettings);
  }, [appearanceSettings]);

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

  const showLibrary = useCallback((updateHistory = true) => {
    audioPause();
    stopTextToSpeech({ preservePosition: true });
    setView("library");
    document.title = "Spanish Listening Reader";
    if (updateHistory && location.hash) {
      history.pushState({}, "", `${location.pathname}${location.search}`);
    }
    setSelectedWord(null);
    setAnchorEl(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [audioPause, stopTextToSpeech]);

  const showReader = useCallback((trackTitle?: string) => {
    setView("reader");
    document.title = trackTitle ? `${trackTitle} · Spanish Listening Reader` : "Spanish Listening Reader";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Set words and build passages
  const setWords = useCallback((nextWords: WordToken[], precise: boolean) => {
    const indexed = nextWords.map((word, index) => ({ ...word, index }));
    setWordsState(indexed);
    resetSyncState();

    const built = buildPassages(indexed);
    setPassagesState(built);
    setPassageIndex(-1);
  }, [resetSyncState, setPassageIndex]);

  // Load track
  const loadTrack = useCallback(
    async (track: Track, updateHistory = true) => {
      audioPause();
      stopTextToSpeech({ preservePosition: true });
      const loadId = ++trackLoadIdRef.current;
      setActiveTrack(track);
      const isAudio = Boolean(track.audio);
      setMedia(isAudio ? "audio" : "text");

      const savedProgress = progressCache[track.id] as { time?: number; duration?: number; passageIndex?: number } | undefined;
      const pendingTime = savedProgress?.time || 0;
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
        setWords(parsed, false);
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
        const precise = Boolean(track.audio) && parsed.length > 0 && Number.isFinite(parsed[0].start);
        setWords(parsed, precise);

        if (track.audio) {
          const resumeMessage = resumeAt > 0 ? ` Resuming.` : "";
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
    [audioPause, clearAudioSource, progressCache, setAudioSource, setWords, showReader, stopTextToSpeech]
  );

  // Initialize
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
        await loadTrack(routeTrack, false);
      }
    })();

    const handlePopState = () => {
      const hash = safeDecodeHash();
      if (!hash) {
        showLibrary(false);
      } else {
        const found = tracks.find((t) => t.id === hash);
        if (found) loadTrack(found, false);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      mounted = false;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loadLibrary, loadPersonalBooks, loadTrack, showLibrary, tracks]);

  // Mode switching
  const handleSelectReaderMode = (mode: ReaderMode) => {
    if (mode === "passages" && (media === "text" || !audioRef.current?.src || !passages.length)) {
      setStatusText("Passages need a synced transcript for this audio.");
      return;
    }
    if (media === "text" && mode === "read" && ttsState === "playing") {
      pauseTextToSpeech();
    }
    setReaderMode(mode);
    if (mode === "passages") {
      audioPause();
      const idx = findPassageAt(passages, audioCurrentTime);
      setPassageIndex(idx >= 0 ? idx : 0);
    }
  };

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
      saveActiveProgress({
        activeTrackId: track.id,
        media: "audio",
        progressCache: nextProgress,
        force: true
      });
      if (activeTrack?.id === track.id) {
        showLibrary();
      }
    } catch {
      window.alert("The book could not be removed.");
    }
  };

  const handleLogWord = (word: WordToken, meaning: string) => {
    const updated = logStudiedWord(word, meaning, words, activeTrack?.title || "", studyLog);
    setStudyLog(updated);
  };

  const studyCardCount = Object.keys(studyLog).length;
  const isAudioMedia = media === "audio";

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
            settings={catalogSettings}
            studyCardCount={studyCardCount}
            onUpdateSettings={setCatalogSettings}
            onOpenAddBook={() => setAddBookOpen(true)}
            onOpenAnkiReview={() => setAnkiOpen(true)}
            onOpenOnboarding={() => openOnboarding(1)}
          />

          <CatalogControls
            settings={catalogSettings}
            totalCount={tracks.length}
            filteredCount={tracks.length}
            onUpdateSettings={setCatalogSettings}
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
              setCatalogSettings({
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
            readerMode={readerMode}
            passagesAvailable={Boolean(activeTrack?.audio && passages.length)}
            isTextOnly={!activeTrack?.audio}
            onBackToLibrary={() => showLibrary(true)}
            onSelectReaderMode={handleSelectReaderMode}
            onOpenAppearance={() => setAppearanceOpen(true)}
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
            ttsVoices={ttsVoices}
            selectedVoiceURI={selectedVoiceURI}
            playbackRate={appearanceSettings.playbackRate}
            disabled={!words.length}
            onTogglePlay={() => {
              if (isAudioMedia) audioTogglePlay();
              else toggleTextToSpeech();
            }}
            onSeek={(val) => {
              if (isAudioMedia) audioSeek(val);
              else seekTextToSpeech(val);
            }}
            onSkipBack={() => {
              if (isAudioMedia) audioSkipBy(-10);
              else moveTtsChunk(-1);
            }}
            onSkipForward={() => {
              if (isAudioMedia) audioSkipBy(10);
              else moveTtsChunk(1);
            }}
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
            }}
          />

          <section className="workspace">
            <section className="reader-shell" aria-label="Transcript reader">
              {/* Reading metadata facts */}
              {activeTrack && (
                <div id="readingMeta" className="reading-meta">
                  <div className="reading-facts">
                    {activeTrack.difficulty && <span>{activeTrack.difficulty}</span>}
                    {activeTrack.author && <span>{activeTrack.author}</span>}
                    {(activeTrack as { genre?: string }).genre && <span>{(activeTrack as { genre?: string }).genre}</span>}
                    {activeTrack.minutes ? <span>{activeTrack.minutes} min</span> : null}
                  </div>
                </div>
              )}

              {/* Passages mode practice header */}
              {readerMode === "passages" && (
                <PassagePractice
                  passageIndex={passageIndex}
                  totalPassages={passages.length}
                  passageRevealed={passageRevealed}
                  onToggleReveal={() => setPassageRevealed(!passageRevealed)}
                  onReplay={playCurrentPassage}
                  onPrevious={() => movePassage(-1)}
                  onNext={() => movePassage(1)}
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
                    const firstWord = readerRef.current?.querySelector(".word");
                    firstWord?.scrollIntoView({ behavior: "smooth", block: "start" });
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
                onWordClick={(word, btn) => {
                  setSelectedWord(word);
                  setAnchorEl(btn);
                }}
              />
            </section>

            <aside className="study-panel">
              <div id="definition" className="definition">
                <p className="muted">Tap a word for an English meaning.</p>
              </div>
            </aside>
          </section>

          {/* Word Popover */}
          {selectedWord && anchorEl && (
            <WordPopover
              selectedWord={selectedWord}
              anchorEl={anchorEl}
              words={words}
              media={media}
              onClose={() => {
                setSelectedWord(null);
                setAnchorEl(null);
              }}
              onPlayFromHere={handlePlayFromHere}
              onLogWord={handleLogWord}
            />
          )}
        </section>
      )}

      {/* Modals & Dialogs */}
      <AppearanceModal
        isOpen={appearanceOpen}
        settings={appearanceSettings}
        onClose={() => setAppearanceOpen(false)}
        onUpdateSettings={(updater) => {
          setAppearanceSettings((prev) => {
            const next = updater(prev);
            saveAppearanceSettings(next);
            return next;
          });
        }}
        onOpenOnboarding={() => openOnboarding(1)}
      />

      <AnkiReviewModal
        isOpen={ankiOpen}
        studyLog={studyLog}
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
        onRemoveEntry={(key) => {
          setStudyLog((prev) => {
            const next = { ...prev };
            delete next[key];
            saveStudyLog(next);
            return next;
          });
        }}
      />

      <AddBookModal
        isOpen={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        onBookAdded={(book) => {
          const normalized = normalizeTrack({ ...book, personal: true, collection: "my-books" });
          const updated = [normalized, ...personalBooks];
          setPersonalBooks(updated);
          refreshTracks(hostedTracks, updated);
          loadTrack(normalized, true);
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

      {/* Screen reader status element */}
      <p id="status" className="visually-hidden" role="status" aria-live="polite">
        {statusText}
      </p>
    </div>
  );
};
