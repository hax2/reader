export interface Track {
  id: string;
  title: string;
  author?: string;
  year?: number;
  translator?: string;
  editionYear?: number;
  originalLanguage?: string;
  difficulty: string;
  difficultyNote?: string;
  genre?: string;
  tags?: string[];
  collection: string;
  minutes: number;
  wordCount?: number;
  source?: string;
  rights?: string;
  sourceText?: string;
  audio?: string;
  text?: string;
  transcript?: string;
  audioGenerator?: string;
  mediaVersion?: string;
  cover?: string;
  description?: string;
  englishTranslation?: string;
  personal?: boolean;
  customText?: string;
  addedAt?: string;
}

export interface WordToken {
  text: string;
  index: number;
  start: number;
  end: number;
  separator?: string;
  prefix?: string;
  emphasis?: boolean;
  paragraphBreak?: boolean;
  translation?: string;
}

export interface AppearanceSettings {
  theme: "system" | "paper" | "mist" | "night";
  highlight: string;
  textMode: "dim-passed" | "dim-upcoming";
  translationLayout: "spanish-only" | "side-by-side" | "english-below";
  textSize: number;
  lineHeight: number;
  font: "serif" | "sans" | "accessible";
  readerWidth: "narrow" | "standard" | "wide";
  vocabWarmup: "always" | "collapsed" | "off";
  playbackRate: number;
  ttsVoiceURI: string;
}

export interface CatalogSettings {
  search: string;
  format: "all" | "listen" | "read";
  sort: "difficulty" | "title" | "author" | "length";
  level: string;
  collection: string;
}

export interface Passage {
  startWordIndex: number;
  endWordIndex: number;
  startTime: number;
  endTime: number;
}

export interface StudyEntry {
  word: string;
  normalized: string;
  meaning: string;
  context: string;
  reading: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lookupCount: number;
}

export type StudyLog = Record<string, StudyEntry>;

export interface PersonalBook {
  id: string;
  title: string;
  author?: string;
  description?: string;
  customText: string;
  wordCount?: number;
  addedAt: string;
  cover?: string;
  difficulty?: string;
  collection?: string;
  minutes?: number;
  personal?: boolean;
}

export interface SavedTranslationBlock {
  source: string;
  translation: string;
}

export interface TtsOffset {
  charIndex: number;
  wordIndex: number;
}

export interface TtsChunk {
  startWord: number;
  endWord: number;
  text: string;
  offsets: TtsOffset[];
}

export interface ProgressEntry {
  time?: number;
  duration?: number;
  wordIndex?: number;
  wordCount?: number;
  passageIndex?: number;
  completed?: boolean;
  updatedAt?: string;
}

export type ProgressCache = Record<string, ProgressEntry>;

export type ReaderMode = "read" | "listen" | "passages";
export type TranslationLayout = "spanish-only" | "side-by-side" | "english-below";
