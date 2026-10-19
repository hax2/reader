import {
  personalBooksDatabase,
  personalBooksStore,
  appearanceSettingsVersion,
  difficultyOrder,
  collectionOptions,
  themeOptions,
  SPEED_RATES
} from "./constants";
import {
  numberInRange,
  safeSetLocalStorage,
  htmlToText,
  tsvField,
  normalizeWord
} from "./text";
import { buildContextualTranslationRequest } from "./translations";

export { safeSetLocalStorage };
import type {
  PersonalBook,
  AppearanceSettings,
  CatalogSettings,
  ProgressCache,
  StudyLog,
  StudyEntry,
  WordToken
} from "../types";

export function openPersonalBooksDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(personalBooksDatabase, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(personalBooksStore)) {
        request.result.createObjectStore(personalBooksStore, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open personal library"));
  });
}

export async function readPersonalBooks(): Promise<PersonalBook[]> {
  const database = await openPersonalBooksDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(personalBooksStore, "readonly")
        .objectStore(personalBooksStore)
        .getAll();
      request.onsuccess = () => resolve((request.result as PersonalBook[]) || []);
      request.onerror = () => reject(request.error || new Error("Could not read personal library"));
    });
  } finally {
    database.close();
  }
}

export async function savePersonalBook(book: PersonalBook): Promise<void> {
  const database = await openPersonalBooksDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(personalBooksStore, "readwrite");
      transaction.objectStore(personalBooksStore).put(book);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not save personal book"));
      transaction.onabort = () => reject(transaction.error || new Error("Could not save personal book"));
    });
  } finally {
    database.close();
  }
}

export async function deletePersonalBook(id: string): Promise<void> {
  const database = await openPersonalBooksDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(personalBooksStore, "readwrite");
      transaction.objectStore(personalBooksStore).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not remove personal book"));
      transaction.onabort = () => reject(transaction.error || new Error("Could not remove personal book"));
    });
  } finally {
    database.close();
  }
}

export function createPersonalBookId(): string {
  const unique = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `personal-${unique}`;
}

export function loadTranslationCache(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem("spanish-reader-translations") || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (
        typeof value === "string" &&
        !/MYMEMORY WARNING|YOU USED ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT EXCEEDED|INVALID EMAIL/i.test(value)
      ) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveTranslationCache(cache: Record<string, string>): void {
  safeSetLocalStorage("spanish-reader-translations", cache);
}

export function loadProgressCache(): ProgressCache {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-progress") || "{}");
  } catch {
    return {};
  }
}

export function saveProgressCache(cache: ProgressCache): void {
  safeSetLocalStorage("spanish-reader-progress", cache);
}

let lastProgressSave = 0;

export function saveActiveProgress({
  activeTrackId,
  media,
  audioDuration,
  audioCurrentTime,
  audioEnded,
  activeAudioSource,
  currentAudioSrc,
  readerMode,
  passageIndex,
  wordIndex,
  wordCount,
  progressCache,
  force = false,
  onSaved
}: {
  activeTrackId: string;
  media: "audio" | "text";
  audioDuration?: number;
  audioCurrentTime?: number;
  audioEnded?: boolean;
  activeAudioSource?: string;
  currentAudioSrc?: string;
  readerMode?: string;
  passageIndex?: number;
  wordIndex?: number;
  wordCount?: number;
  progressCache: ProgressCache;
  force?: boolean;
  onSaved?: (updated: ProgressCache) => void;
}): void {
  if (media === "text") {
    if (!activeTrackId || !wordCount) return;
    const now = Date.now();
    if (!force && now - lastProgressSave < 1500) return;
    lastProgressSave = now;
    const index = Math.max(0, Math.min(wordIndex || 0, wordCount));
    progressCache[activeTrackId] = {
      wordIndex: index,
      wordCount,
      completed: index >= wordCount,
      updatedAt: new Date().toISOString()
    };
    saveProgressCache(progressCache);
    onSaved?.({ ...progressCache });
    return;
  }

  if (media !== "audio" || !activeTrackId || !audioDuration || !Number.isFinite(audioDuration)) return;
  if (activeAudioSource && currentAudioSrc && currentAudioSrc !== activeAudioSource) return;
  const now = Date.now();
  if (!force && now - lastProgressSave < 1500) return;
  lastProgressSave = now;

  const time = audioEnded ? audioDuration : (audioCurrentTime || 0);
  progressCache[activeTrackId] = {
    time: Math.max(0, Math.min(time, audioDuration)),
    duration: audioDuration,
    updatedAt: new Date().toISOString(),
    ...(readerMode === "passages" && typeof passageIndex === "number" && passageIndex >= 0 ? { passageIndex } : {})
  };
  saveProgressCache(progressCache);
  onSaved?.({ ...progressCache });
}

export function loadStudyLog(): StudyLog {
  try {
    return JSON.parse(localStorage.getItem("spanish-reader-study-log") || "{}");
  } catch {
    return {};
  }
}

export function saveStudyLog(log: StudyLog): void {
  safeSetLocalStorage("spanish-reader-study-log", log);
}

export function endsSentence(word: WordToken): boolean {
  return /[.,:;!?…]["')\]»”]*\s*$/.test(`${word.text}${word.separator || ""}`);
}

export function contextRangeForWord(index: number, words: WordToken[]): { start: number; end: number } {
  let start = index;
  while (start > 0 && start > index - 3 && !endsSentence(words[start - 1])) start -= 1;

  let end = index;
  while (end < words.length - 1 && end < index + 1 && !endsSentence(words[end])) end += 1;

  return { start, end };
}

export function contextSentenceForWord(index: number, words: WordToken[]): string {
  if (!Number.isFinite(index) || !words[index]) return "";
  const { start, end } = contextRangeForWord(index, words);

  return words
    .slice(start, end + 1)
    .map((word, offset) => {
      const absoluteIndex = start + offset;
      const prefix = word.prefix || "";
      const text = absoluteIndex === index ? `<b>${word.text}</b>` : word.text;
      return `${prefix}${text}${word.separator || " "}`;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function plainTextForWords(start: number, end: number, words: WordToken[]): string {
  return words
    .slice(start, end)
    .map((word) => `${word.prefix || ""}${word.text}${word.separator || " "}`)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function contextualRequestForWord(index: number, targetHTML: string, words: WordToken[]): string {
  const { start, end } = contextRangeForWord(index, words);
  const before = plainTextForWords(Math.max(0, start - 60), start, words);
  const after = plainTextForWords(end + 1, Math.min(words.length, end + 61), words);
  return buildContextualTranslationRequest(targetHTML, before, after, "i");
}

export function logStudiedWord(
  word: WordToken,
  meaning: string,
  words: WordToken[],
  readingTitle: string,
  studyLog: StudyLog
): StudyLog {
  if (!word || !meaning || /looking up/i.test(String(meaning))) return studyLog;
  const normalized = normalizeWord(word.text);
  if (!normalized) return studyLog;

  const context = contextSentenceForWord(word.index, words);
  const reading = readingTitle || "Untitled reading";
  const contextText = htmlToText(context);
  const key = `${normalized}\u241f${reading}\u241f${contextText}`;
  const previous = studyLog[key] || {};
  const updated: StudyLog = {
    ...studyLog,
    [key]: {
      word: word.text,
      normalized,
      meaning: htmlToText(meaning),
      context: contextText,
      reading,
      firstSeenAt: previous.firstSeenAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lookupCount: (previous.lookupCount || 0) + 1
    }
  };
  saveStudyLog(updated);
  return updated;
}

export function studyEntries(studyLog: StudyLog): [string, StudyEntry][] {
  return Object.entries(studyLog)
    .filter(([, entry]) => entry && typeof entry === "object")
    .sort(([, a], [, b]) =>
      String(a.normalized || a.word).localeCompare(String(b.normalized || b.word), "es")
    );
}

export function downloadableStudyEntries(studyLog: StudyLog): [string, StudyEntry][] {
  return studyEntries(studyLog).filter(
    ([, entry]) => String(entry.word || "").trim() && String(entry.meaning || "").trim()
  );
}

export function downloadAnkiCards(studyLog: StudyLog): void {
  const entries = downloadableStudyEntries(studyLog).map(([, entry]) => entry);
  if (!entries.length) return;

  const rows = entries.map((entry) =>
    [entry.word, entry.meaning, htmlToText(entry.context), entry.reading]
      .map(tsvField)
      .join("\t")
  );
  const blob = new Blob([`${rows.join("\n")}\n`], {
    type: "text/tab-separated-values;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spanish-reader-anki-${new Date().toISOString().slice(0, 10)}.tsv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function loadCatalogSettings(): CatalogSettings {
  try {
    const saved = JSON.parse(localStorage.getItem("reader-catalog-v1") || "{}");
    return {
      search: String(saved.search || ""),
      format: (["all", "listen", "read"].includes(saved.format) ? saved.format : "all") as CatalogSettings["format"],
      sort: (["difficulty", "title", "author", "length"].includes(saved.sort) ? saved.sort : "difficulty") as CatalogSettings["sort"],
      level: ["all", ...(difficultyOrder as readonly string[])].includes(saved.level) ? saved.level : "all",
      collection: (collectionOptions as readonly string[]).includes(saved.collection) ? saved.collection : "all"
    };
  } catch {
    return { search: "", format: "all", sort: "difficulty", level: "all", collection: "all" };
  }
}

export function saveCatalogSettings(catalogSettings: CatalogSettings): void {
  try {
    localStorage.setItem("reader-catalog-v1", JSON.stringify(catalogSettings));
  } catch {
    // Catalog preferences are optional when storage is unavailable.
  }
}

export function defaultAppearanceSettings(): AppearanceSettings {
  return {
    theme: "system",
    highlight: "none",
    textMode: "dim-upcoming",
    translationLayout: "english-below",
    textSize: 100,
    lineHeight: 1.8,
    font: "serif",
    readerWidth: "standard",
    vocabWarmup: "collapsed",
    playbackRate: 1,
    ttsVoiceURI: ""
  };
}

export function loadAppearanceSettings(): AppearanceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem("spanish-reader-appearance") || "{}");
    const defaults = defaultAppearanceSettings();
    const isCurrentVersion = saved.version === appearanceSettingsVersion;
    return {
      theme: (themeOptions as readonly string[]).includes(saved.theme) ? saved.theme : defaults.theme,
      highlight:
        isCurrentVersion && ["sage", "sky", "rose", "underline", "none"].includes(saved.highlight)
          ? saved.highlight
          : defaults.highlight,
      textMode:
        isCurrentVersion && ["dim-passed", "dim-upcoming"].includes(saved.textMode)
          ? saved.textMode
          : defaults.textMode,
      translationLayout: ["spanish-only", "side-by-side", "english-below"].includes(saved.translationLayout)
        ? saved.translationLayout
        : defaults.translationLayout,
      textSize: numberInRange(saved.textSize, 80, 140, defaults.textSize),
      lineHeight: numberInRange(saved.lineHeight, 1.4, 2.2, defaults.lineHeight),
      font: ["serif", "sans", "accessible"].includes(saved.font) ? saved.font : defaults.font,
      readerWidth: ["narrow", "standard", "wide"].includes(saved.readerWidth)
        ? saved.readerWidth
        : defaults.readerWidth,
      vocabWarmup: ["always", "collapsed", "off"].includes(saved.vocabWarmup)
        ? saved.vocabWarmup
        : defaults.vocabWarmup,
      playbackRate: SPEED_RATES.includes(Number(saved.playbackRate))
        ? Number(saved.playbackRate)
        : defaults.playbackRate,
      ttsVoiceURI: String(saved.ttsVoiceURI || "")
    };
  } catch {
    return defaultAppearanceSettings();
  }
}

export function saveAppearanceSettings(settings: AppearanceSettings): void {
  safeSetLocalStorage("spanish-reader-appearance", {
    ...settings,
    version: appearanceSettingsVersion
  });
}

export function resolveTheme(theme: string): string {
  if (theme === "system") {
    const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    return prefersDark ? "night" : "paper";
  }
  return theme;
}

export function applyAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(settings.theme);
  document.documentElement.dataset.highlight = settings.highlight;
  document.documentElement.dataset.textMode = settings.textMode;
  document.documentElement.dataset.translationLayout = settings.translationLayout;
  const appEl = document.querySelector(".app") as HTMLElement | null;
  if (appEl) {
    appEl.dataset.translationLayout = settings.translationLayout;
  }
  document.documentElement.dataset.readerFont = settings.font;
  document.documentElement.dataset.readerWidth = settings.readerWidth;
  document.documentElement.style.setProperty(
    "--reader-font-size",
    `${(1.6 * settings.textSize) / 100}rem`
  );
  document.documentElement.style.setProperty("--reader-line-height", String(settings.lineHeight));
}
