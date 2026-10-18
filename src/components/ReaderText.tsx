import React, { useEffect, useRef, useMemo, useState } from "react";
import { lookupSavedTranslation, translateReadingText } from "../utils/translations";
import type { WordToken, AppearanceSettings, ReaderMode, Passage } from "../types";

export interface ReaderTextProps {
  words: WordToken[];
  readerRef: React.RefObject<HTMLElement | null>;
  readerMode: ReaderMode;
  passage: Passage | null;
  passageRevealed: boolean;
  appearanceSettings: AppearanceSettings;
  onWordClick: (word: WordToken, anchor: HTMLButtonElement) => void;
}

export interface ReadingTarget {
  element: HTMLElement;
  source: string;
  blockIndex: number;
  before?: string;
  after?: string;
}

export function createReadingPair(): { container: HTMLElement; spanish: HTMLElement } {
  const container = document.createElement("section");
  container.className = "translation-pair";
  const spanish = document.createElement("p");
  spanish.className = "spanish-text";
  spanish.lang = "es";
  container.append(spanish);
  return { container, spanish };
}

export function finishReadingPair(
  pair: { container: HTMLElement; spanish: HTMLElement },
  sourceText: string,
  bilingual: boolean,
  targets: ReadingTarget[],
  sources: string[],
  fragment: DocumentFragment,
  blockIndex: number
): void {
  const source = sourceText.trim();
  sources.push(source);
  if (bilingual) {
    const english = document.createElement("p");
    english.className = "english-translation";
    english.lang = "en";
    const savedTranslation = lookupSavedTranslation(source);
    if (savedTranslation) {
      english.textContent = savedTranslation;
      english.setAttribute("aria-busy", "false");
    } else {
      english.classList.add("is-loading");
      english.setAttribute("aria-busy", "true");
      english.innerHTML = `<span class="translation-placeholder">Translating…</span>`;
      targets.push({ element: english, source, blockIndex });
    }
    pair.container.append(english);
  }
  fragment.append(pair.container);
}

export async function loadReadingTranslation(
  target: ReadingTarget,
  renderId?: number
): Promise<void> {
  const translated = await translateReadingText(target.source, target.before, target.after);
  if (translated) {
    target.element.textContent = translated;
    target.element.classList.remove("is-loading");
    target.element.setAttribute("aria-busy", "false");
  }
}

export function observeTranslationTargets(
  targets: ReadingTarget[],
  renderId?: number
): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    targets.forEach((target) => loadReadingTranslation(target, renderId));
    return null;
  }
  const sources = new WeakMap(targets.map((target) => [target.element, target]));
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const target = sources.get(entry.target as HTMLElement);
      if (target) loadReadingTranslation(target, renderId);
    });
  }, { rootMargin: "500px 0px" });
  targets.forEach((target) => observer.observe(target.element));
  return observer;
}

export function renderWords(props?: ReaderTextProps): React.ReactElement | null {
  return props ? <ReaderText {...props} /> : null;
}

interface ReadingPairData {
  words: WordToken[];
  sourceText: string;
  blockIndex: number;
}

export const ReaderText: React.FC<ReaderTextProps> = ({
  words,
  readerRef,
  readerMode,
  passage,
  passageRevealed,
  appearanceSettings,
  onWordClick
}) => {
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const startIndex = readerMode === "passages" && passage ? passage.startWordIndex : 0;
  const endIndex = readerMode === "passages" && passage ? passage.endWordIndex : words.length - 1;

  const bilingual =
    readerMode !== "passages" && appearanceSettings.translationLayout !== "off";
  const sentencesPerPair =
    appearanceSettings.translationLayout === "english-below" ? 1 : 4;

  const pairs = useMemo(() => {
    if (!words.length || startIndex > endIndex) return [];
    const result: ReadingPairData[] = [];
    let currentWords: WordToken[] = [];
    let currentText = "";
    let sentenceCount = 0;
    let blockIndex = 0;

    for (let index = startIndex; index <= endIndex; index += 1) {
      const word = words[index];
      currentWords.push(word);
      currentText += `${word.prefix || ""}${word.text}${word.separator || " "}`;

      if (/[.!?…]["')\]»”]*\s*$/.test(`${word.text}${word.separator || ""}`)) {
        sentenceCount += 1;
      }

      if (sentenceCount >= sentencesPerPair && index < endIndex) {
        result.push({
          words: currentWords,
          sourceText: currentText.trim(),
          blockIndex
        });
        blockIndex += 1;
        currentWords = [];
        currentText = "";
        sentenceCount = 0;
      }
    }

    if (currentWords.length) {
      result.push({
        words: currentWords,
        sourceText: currentText.trim(),
        blockIndex
      });
    }

    return result;
  }, [endIndex, sentencesPerPair, startIndex, words]);

  // Load saved translations or observe for async translation
  useEffect(() => {
    if (!bilingual || !pairs.length) {
      setTranslations({});
      return;
    }

    const initial: Record<number, string> = {};
    const uncomputed: { blockIndex: number; source: string; before: string; after: string }[] = [];

    pairs.forEach((pair, idx) => {
      const saved = lookupSavedTranslation(pair.sourceText);
      if (saved) {
        initial[pair.blockIndex] = saved;
      } else {
        const before = pairs[idx - 1]?.sourceText || "";
        const after = pairs[idx + 1]?.sourceText || "";
        uncomputed.push({ blockIndex: pair.blockIndex, source: pair.sourceText, before, after });
      }
    });

    setTranslations(initial);

    if (!uncomputed.length) return;

    if (typeof IntersectionObserver === "undefined") {
      uncomputed.forEach(({ blockIndex, source, before, after }) => {
        translateReadingText(source, before, after).then((trans) => {
          if (trans) setTranslations((prev) => ({ ...prev, [blockIndex]: trans }));
        });
      });
      return;
    }

    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          observer.unobserve(target);
          const bIndex = Number(target.dataset.blockIndex);
          const item = uncomputed.find((u) => u.blockIndex === bIndex);
          if (item) {
            translateReadingText(item.source, item.before, item.after).then((trans) => {
              if (trans) setTranslations((prev) => ({ ...prev, [bIndex]: trans }));
            });
          }
        });
      },
      { rootMargin: "500px 0px" }
    );
    observerRef.current = observer;

    const elements = readerRef.current?.querySelectorAll(".english-translation.is-loading");
    elements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [bilingual, pairs, readerRef]);

  const isHidden = readerMode === "passages" && !passageRevealed;

  return (
    <main
      id="reader"
      ref={readerRef}
      className={`reader${bilingual ? " has-translation" : ""}${
        appearanceSettings.translationLayout === "side-by-side" ? " is-side-by-side" : ""
      }`}
      hidden={isHidden}
    >
      {pairs.map((pair) => {
        const translationText = translations[pair.blockIndex];
        const isLoadingTranslation = bilingual && !translationText;

        return (
          <section key={pair.blockIndex} className="translation-pair">
            <p className="spanish-text" lang="es">
              {pair.words.map((word: WordToken) => (
                <React.Fragment key={word.index}>
                  {word.prefix && <span>{word.prefix}</span>}
                  <button
                    type="button"
                    className="word"
                    data-index={word.index}
                    tabIndex={word.index === startIndex ? 0 : -1}
                    onClick={(e) => onWordClick(word, e.currentTarget)}
                  >
                    {word.text}
                  </button>
                  <span>{word.separator || " "}</span>
                </React.Fragment>
              ))}
            </p>

            {bilingual && (
              <p
                className={`english-translation${isLoadingTranslation ? " is-loading" : ""}`}
                lang="en"
                data-block-index={pair.blockIndex}
                aria-busy={isLoadingTranslation ? "true" : "false"}
              >
                {translationText ? (
                  translationText
                ) : (
                  <span className="translation-placeholder">Translating…</span>
                )}
              </p>
            )}
          </section>
        );
      })}
    </main>
  );
};
