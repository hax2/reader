import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { lookupSavedTranslation, translateReadingText } from "../utils/translations";
import { setWordTabStop } from "../hooks/useWordSync";
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
  const [failedBlocks, setFailedBlocks] = useState<Record<number, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const renderIdRef = useRef<number>(0);

  const startIndex = readerMode === "passages" && passage ? passage.startWordIndex : 0;
  const endIndex = readerMode === "passages" && passage ? passage.endWordIndex : words.length - 1;

  const bilingual =
    readerMode !== "passages" && appearanceSettings.translationLayout !== "spanish-only";
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

  const fetchBlockTranslation = useCallback(
    (blockIndex: number, source: string, before: string, after: string, currentRenderId: number) => {
      setFailedBlocks((prev) => {
        if (!prev[blockIndex]) return prev;
        const next = { ...prev };
        delete next[blockIndex];
        return next;
      });
      translateReadingText(source, before, after)
        .then((trans) => {
          if (currentRenderId !== renderIdRef.current) return;
          if (trans) {
            setTranslations((prev) => ({ ...prev, [blockIndex]: trans }));
          } else {
            setFailedBlocks((prev) => ({ ...prev, [blockIndex]: true }));
          }
        })
        .catch(() => {
          if (currentRenderId !== renderIdRef.current) return;
          setFailedBlocks((prev) => ({ ...prev, [blockIndex]: true }));
        });
    },
    []
  );

  // Load saved translations or observe for async translation
  useEffect(() => {
    const currentRenderId = ++renderIdRef.current;
    if (!bilingual || !pairs.length) {
      setTranslations({});
      setFailedBlocks({});
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
    setFailedBlocks({});

    if (!uncomputed.length) return;

    if (typeof IntersectionObserver === "undefined") {
      uncomputed.forEach(({ blockIndex, source, before, after }) => {
        fetchBlockTranslation(blockIndex, source, before, after, currentRenderId);
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
            fetchBlockTranslation(item.blockIndex, item.source, item.before, item.after, currentRenderId);
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
  }, [bilingual, fetchBlockTranslation, pairs, readerRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest(".word") as HTMLButtonElement | null;
    if (!target || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const offset = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
    const next = readerRef.current?.querySelector(
      `[data-index="${Number(target.dataset.index) + offset}"]`
    ) as HTMLButtonElement | null;
    if (next) {
      setWordTabStop(readerRef.current, next);
      next.focus();
    }
  };

  const isHidden = readerMode === "passages" && !passageRevealed;

  return (
    <article
      id="reader"
      ref={readerRef as React.RefObject<HTMLElement>}
      className={`reader${bilingual ? " has-translation" : ""}${
        appearanceSettings.translationLayout === "side-by-side" ? " is-side-by-side" : ""
      }`}
      lang="es"
      hidden={isHidden}
      onKeyDown={handleKeyDown}
    >
      {pairs.map((pair, idx) => {
        const translationText = translations[pair.blockIndex];
        const hasError = Boolean(failedBlocks[pair.blockIndex]);
        const isLoadingTranslation = bilingual && !translationText && !hasError;

        return (
          <section key={pair.blockIndex} className="translation-pair">
            <p className="spanish-text" lang="es">
              {pair.words.map((word: WordToken) => (
                <React.Fragment key={word.index}>
                  {word.prefix || ""}
                  <button
                    type="button"
                    className="word"
                    data-index={word.index}
                    tabIndex={word.index === startIndex ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setWordTabStop(readerRef.current, e.currentTarget);
                      onWordClick(word, e.currentTarget);
                    }}
                  >
                    {word.text}
                  </button>
                  {word.separator || " "}
                </React.Fragment>
              ))}
            </p>

            {bilingual && (
              <p
                className={`english-translation${isLoadingTranslation ? " is-loading" : ""}${
                  hasError ? " has-error" : ""
                }`}
                lang="en"
                data-block-index={pair.blockIndex}
                aria-busy={isLoadingTranslation ? "true" : "false"}
              >
                {translationText ? (
                  translationText
                ) : hasError ? (
                  <>
                    <span>Translation unavailable.</span>{" "}
                    <button
                      type="button"
                      className="translation-retry"
                      onClick={() =>
                        fetchBlockTranslation(
                          pair.blockIndex,
                          pair.sourceText,
                          pairs[idx - 1]?.sourceText || "",
                          pairs[idx + 1]?.sourceText || "",
                          renderIdRef.current
                        )
                      }
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <span className="translation-placeholder">Translating…</span>
                )}
              </p>
            )}
          </section>
        );
      })}
    </article>
  );
};
