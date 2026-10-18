import { useState, useRef, useCallback, useEffect } from "react";
import { resolveTheme, safeSetLocalStorage } from "../utils/storage";
import type { AppearanceSettings, CatalogSettings } from "../types";

export const DEMO_EXCERPT_WORDS = [
  { word: "Platero", separator: " ", def: "Platero (the silver donkey in Juan Ramón Jiménez's classic)", start: 0.0, dur: 0.5 },
  { word: "es", separator: " ", def: "is (from <em>ser</em>)", start: 0.5, dur: 0.25 },
  { word: "pequeño,", separator: " ", def: "small, little (adj.)", start: 0.75, dur: 0.6 },
  { word: "peludo,", separator: " ", def: "furry, hairy (adj.)", start: 1.35, dur: 0.6 },
  { word: "suave;", separator: " ", def: "soft, smooth, gentle (adj.)", start: 1.95, dur: 0.65 },
  { word: "tan", separator: " ", def: "so, as (adv.)", start: 2.6, dur: 0.3 },
  { word: "blando", separator: " ", def: "soft, tender, yielding (adj.)", start: 2.9, dur: 0.5 },
  { word: "por", separator: " ", def: "by, on (prep.)", start: 3.4, dur: 0.25 },
  { word: "fuera,", separator: " ", def: "outside, on the exterior (adv.)", start: 3.65, dur: 0.6 },
  { word: "que", separator: " ", def: "that, which (conj.)", start: 4.25, dur: 0.25 },
  { word: "se", separator: " ", def: "oneself / passive marker (pron.)", start: 4.5, dur: 0.25 },
  { word: "diría", separator: " ", def: "one would say (from <em>decir</em>)", start: 4.75, dur: 0.5 },
  { word: "todo", separator: " ", def: "entirely, all (adv./adj.)", start: 5.25, dur: 0.4 },
  { word: "de", separator: " ", def: "of, made of (prep.)", start: 5.65, dur: 0.2 },
  { word: "algodón,", separator: " ", def: "cotton (noun masc.)", start: 5.85, dur: 0.7 },
  { word: "que", separator: " ", def: "that, which (conj.)", start: 6.55, dur: 0.25 },
  { word: "no", separator: " ", def: "not, no (adv.)", start: 6.8, dur: 0.25 },
  { word: "lleva", separator: " ", def: "carries, has (from <em>llevar</em>)", start: 7.05, dur: 0.4 },
  { word: "huesos.", separator: " ", def: "bones (noun masc. pl.)", start: 7.45, dur: 0.8 },
  { word: "Sólo", separator: " ", def: "Only, just (adv.)", start: 8.25, dur: 0.4 },
  { word: "los", separator: " ", def: "the (masc. pl. art.)", start: 8.65, dur: 0.25 },
  { word: "espejos", separator: " ", def: "mirrors (noun masc. pl.)", start: 8.9, dur: 0.55 },
  { word: "de", separator: " ", def: "of (prep.)", start: 9.45, dur: 0.2 },
  { word: "azabache", separator: " ", def: "jet-black stone, pitch-black (noun)", start: 9.65, dur: 0.65 },
  { word: "de", separator: " ", def: "of (prep.)", start: 10.3, dur: 0.2 },
  { word: "sus", separator: " ", def: "his, its (possessive)", start: 10.5, dur: 0.3 },
  { word: "ojos", separator: " ", def: "eyes (noun masc. pl.)", start: 10.8, dur: 0.5 },
  { word: "son", separator: " ", def: "are (from <em>ser</em>)", start: 11.3, dur: 0.3 },
  { word: "duros", separator: " ", def: "hard, solid, tough (adj. pl.)", start: 11.6, dur: 0.55 },
  { word: "cual", separator: " ", def: "like, as (prep./adv.)", start: 12.15, dur: 0.35 },
  { word: "dos", separator: " ", def: "two (num.)", start: 12.5, dur: 0.3 },
  { word: "escarabajos", separator: " ", def: "beetles (noun masc. pl.)", start: 12.8, dur: 0.75 },
  { word: "de", separator: " ", def: "of (prep.)", start: 13.55, dur: 0.2 },
  { word: "cristal", separator: " ", def: "crystal, glass (noun masc.)", start: 13.75, dur: 0.55 },
  { word: "negro.", separator: "", def: "black (adj. masc.)", start: 14.3, dur: 0.7 }
];

export const DEMO_TOTAL_DURATION = 15.0;
export const DEMO_ENGLISH_TEXT =
  "Platero is small, furry, soft; so soft on the outside that one would say he is made entirely of cotton, that he has no bones. Only the jet mirrors of his eyes are hard as two beetles of black glass.";

export interface OnboardingState {
  step: number;
  theme: AppearanceSettings["theme"];
  font: AppearanceSettings["font"];
  textSize: number;
  lineHeight: number;
  readerWidth: AppearanceSettings["readerWidth"];
  highlight: AppearanceSettings["highlight"];
  textMode: AppearanceSettings["textMode"];
  translationLayout: AppearanceSettings["translationLayout"];
  playbackRate: number;
  vocabWarmup: AppearanceSettings["vocabWarmup"];
  catalogLevel: string;
  catalogFormat: CatalogSettings["format"];
}

function applyAppearanceToDom(settings: {
  theme: AppearanceSettings["theme"];
  highlight: AppearanceSettings["highlight"];
  textMode: AppearanceSettings["textMode"];
  translationLayout: AppearanceSettings["translationLayout"];
  font: AppearanceSettings["font"];
  readerWidth: AppearanceSettings["readerWidth"];
  textSize: number;
  lineHeight: number;
}) {
  const resolvedTheme = resolveTheme(settings.theme);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.highlight = settings.highlight;
  document.documentElement.dataset.textMode = settings.textMode;
  document.documentElement.dataset.translationLayout = settings.translationLayout;
  document.documentElement.dataset.readerFont = settings.font;
  document.documentElement.dataset.readerWidth = settings.readerWidth;
  document.documentElement.style.setProperty("--reader-font-size", `${(1.6 * settings.textSize) / 100}rem`);
  document.documentElement.style.setProperty("--reader-line-height", String(settings.lineHeight));
}

export function useOnboardingDemo({
  initialAppearance,
  initialCatalog,
  onSave
}: {
  initialAppearance: AppearanceSettings;
  initialCatalog: CatalogSettings;
  onSave: (app: AppearanceSettings, cat: CatalogSettings) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    theme: initialAppearance.theme || "system",
    font: initialAppearance.font || "serif",
    textSize: initialAppearance.textSize || 100,
    lineHeight: initialAppearance.lineHeight || 1.8,
    readerWidth: initialAppearance.readerWidth || "standard",
    highlight: initialAppearance.highlight || "none",
    textMode: initialAppearance.textMode || "dim-upcoming",
    translationLayout: initialAppearance.translationLayout || "english-below",
    playbackRate: initialAppearance.playbackRate || 1,
    vocabWarmup: initialAppearance.vocabWarmup || "collapsed",
    catalogLevel: initialCatalog.level || "all",
    catalogFormat: initialCatalog.format || "all"
  });

  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoCurrentTime, setDemoCurrentTime] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [popoverWord, setPopoverWord] = useState<{ index: number; word: string; def: string } | null>(null);

  const demoRafIdRef = useRef<number>(0);
  const demoLastTimestampRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  isPlayingRef.current = isPlayingDemo;
  currentTimeRef.current = demoCurrentTime;

  // Live ambience feedback on background document while onboarding is open
  useEffect(() => {
    if (!isOpen) return;
    applyAppearanceToDom(state);
  }, [isOpen, state]);

  const pauseDemoSimulation = useCallback(() => {
    setIsPlayingDemo(false);
    if (demoRafIdRef.current) {
      cancelAnimationFrame(demoRafIdRef.current);
      demoRafIdRef.current = 0;
    }
  }, []);

  const resetDemoSimulation = useCallback(() => {
    pauseDemoSimulation();
    setDemoCurrentTime(0);
    setActiveWordIndex(-1);
    setPopoverWord(null);
  }, [pauseDemoSimulation]);

  const tickDemoSimulation = useCallback(
    (timestamp: number) => {
      if (!isPlayingRef.current) return;

      const elapsedSec = (timestamp - demoLastTimestampRef.current) / 1000;
      demoLastTimestampRef.current = timestamp;

      const nextTime = currentTimeRef.current + elapsedSec * state.playbackRate;

      if (nextTime >= DEMO_TOTAL_DURATION) {
        setDemoCurrentTime(DEMO_TOTAL_DURATION);
        setActiveWordIndex(DEMO_EXCERPT_WORDS.length - 1);
        pauseDemoSimulation();
        setTimeout(() => {
          resetDemoSimulation();
        }, 800);
        return;
      }

      setDemoCurrentTime(nextTime);

      const activeIdx = DEMO_EXCERPT_WORDS.findIndex(
        (w) => nextTime >= w.start && nextTime < w.start + w.dur
      );
      setActiveWordIndex(activeIdx);

      demoRafIdRef.current = requestAnimationFrame(tickDemoSimulation);
    },
    [pauseDemoSimulation, resetDemoSimulation, state.playbackRate]
  );

  const playDemoSimulation = useCallback(() => {
    setIsPlayingDemo(true);
    demoLastTimestampRef.current = performance.now();
    setPopoverWord(null);
    if (demoRafIdRef.current) cancelAnimationFrame(demoRafIdRef.current);
    demoRafIdRef.current = requestAnimationFrame(tickDemoSimulation);
  }, [tickDemoSimulation]);

  const toggleDemoSimulation = useCallback(() => {
    if (isPlayingDemo) {
      pauseDemoSimulation();
    } else {
      if (demoCurrentTime >= DEMO_TOTAL_DURATION - 0.2) {
        resetDemoSimulation();
      }
      playDemoSimulation();
    }
  }, [demoCurrentTime, isPlayingDemo, pauseDemoSimulation, playDemoSimulation, resetDemoSimulation]);

  const showDemoWordPopover = useCallback((index: number) => {
    pauseDemoSimulation();
    const item = DEMO_EXCERPT_WORDS[index];
    if (item) {
      setPopoverWord({
        index,
        word: item.word.replace(/[.,;:!?]/g, ""),
        def: item.def
      });
    }
  }, [pauseDemoSimulation]);

  const hideDemoWordPopover = useCallback(() => {
    setPopoverWord(null);
  }, []);

  const openOnboarding = useCallback(
    (step = 1) => {
      setState({
        step,
        theme: initialAppearance.theme || "system",
        font: initialAppearance.font || "serif",
        textSize: initialAppearance.textSize || 100,
        lineHeight: initialAppearance.lineHeight || 1.8,
        readerWidth: initialAppearance.readerWidth || "standard",
        highlight: initialAppearance.highlight || "none",
        textMode: initialAppearance.textMode || "dim-upcoming",
        translationLayout: initialAppearance.translationLayout || "english-below",
        playbackRate: initialAppearance.playbackRate || 1,
        vocabWarmup: initialAppearance.vocabWarmup || "collapsed",
        catalogLevel: initialCatalog.level || "all",
        catalogFormat: initialCatalog.format || "all"
      });
      setIsOpen(true);
      resetDemoSimulation();
    },
    [initialAppearance, initialCatalog, resetDemoSimulation]
  );

  const finishOnboarding = useCallback(() => {
    const updatedAppearance: AppearanceSettings = {
      ...initialAppearance,
      theme: state.theme,
      font: state.font,
      textSize: state.textSize,
      lineHeight: state.lineHeight,
      readerWidth: state.readerWidth,
      highlight: state.highlight,
      textMode: state.textMode,
      translationLayout: state.translationLayout,
      playbackRate: state.playbackRate,
      vocabWarmup: state.vocabWarmup
    };

    const updatedCatalog: CatalogSettings = {
      ...initialCatalog,
      level: state.catalogLevel,
      format: state.catalogFormat
    };

    pauseDemoSimulation();
    setIsOpen(false);
    safeSetLocalStorage("spanish-reader-onboarding-v1", { completed: true, timestamp: Date.now() });
    onSave(updatedAppearance, updatedCatalog);
  }, [initialAppearance, initialCatalog, onSave, pauseDemoSimulation, state]);

  const closeOnboarding = useCallback(
    (saveCurrent = false) => {
      if (saveCurrent) {
        finishOnboarding();
      } else {
        applyAppearanceToDom(initialAppearance);
        pauseDemoSimulation();
        setIsOpen(false);
        safeSetLocalStorage("spanish-reader-onboarding-v1", { completed: true, timestamp: Date.now() });
      }
    },
    [finishOnboarding, initialAppearance, pauseDemoSimulation]
  );

  const goToOnboardingStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, step: Math.min(3, Math.max(1, step)) }));
  }, []);

  useEffect(() => {
    return () => {
      if (demoRafIdRef.current) cancelAnimationFrame(demoRafIdRef.current);
    };
  }, []);

  return {
    isOpen,
    state,
    setState,
    isPlayingDemo,
    demoCurrentTime,
    activeWordIndex,
    popoverWord,
    openOnboarding,
    closeOnboarding,
    goToOnboardingStep,
    playDemoSimulation,
    pauseDemoSimulation,
    toggleDemoSimulation,
    resetDemoSimulation,
    showDemoWordPopover,
    hideDemoWordPopover,
    finishOnboarding
  };
}
