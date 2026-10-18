export const difficultyOrder = ["A2", "B1", "B2", "C1"] as const;
export const collectionOptions = [
  "all",
  "stories",
  "bible",
  "greek-classics",
  "don-quijote",
  "my-books"
] as const;

export const themeOptions = ["system", "paper", "mist", "night"] as const;
export const appearanceSettingsVersion = 4;

export const difficultyLabels: Record<string, string> = {
  A2: "Early reader",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced"
};

export const personalBooksDatabase = "spanish-reader-personal-library";
export const personalBooksStore = "books";
export const maxPersonalBookBytes = 2 * 1024 * 1024;

export const speechSynthesisSupported =
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

export const SPEED_RATES = [0.75, 0.9, 0.95, 1, 1.05, 1.1, 1.25, 1.5, 2];

export const PASSAGE_MIN_SECONDS = 7;
export const PASSAGE_TARGET_SECONDS = 14;
export const PASSAGE_MAX_SECONDS = 21;
export const PASSAGE_MAX_WORDS = 50;
