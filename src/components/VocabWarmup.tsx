import React, { useState, useEffect } from "react";
import { extractUncommonVocab, fetchSingleWordMeaning, type VocabCandidate } from "../utils/vocab";
import { normalizeWord } from "../utils/text";
import type { WordToken, AppearanceSettings, StudyLog } from "../types";

export interface VocabWarmupProps {
  words: WordToken[];
  appearanceSettings: AppearanceSettings;
  studyLog: StudyLog;
  onSaveWord: (word: WordToken, meaning: string) => void;
  onStartReading: () => void;
}

export function updateVocabWarmupVisibility(
  vocabWarmup: HTMLElement | null,
  appearanceSettings: AppearanceSettings,
  wordsCount: number
): void {
  if (!vocabWarmup) return;
  if (appearanceSettings.vocabWarmup === "hidden" || wordsCount < 15) {
    vocabWarmup.hidden = true;
    return;
  }
  vocabWarmup.hidden = false;
  vocabWarmup.classList.toggle("is-collapsed", appearanceSettings.vocabWarmup === "collapsed");
}

export function renderVocabWarmup(props?: VocabWarmupProps): React.ReactElement | null {
  return props ? <VocabWarmup {...props} /> : null;
}

export const VocabWarmup: React.FC<VocabWarmupProps> = ({
  words,
  appearanceSettings,
  studyLog,
  onSaveWord,
  onStartReading
}) => {
  const [candidates, setCandidates] = useState<VocabCandidate[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(
    appearanceSettings.vocabWarmup === "collapsed"
  );
  const [asyncDefinitions, setAsyncDefinitions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (appearanceSettings.vocabWarmup === "hidden" || !words || words.length < 15) {
      setCandidates([]);
      return;
    }
    const extracted = extractUncommonVocab(words);
    setCandidates(extracted);

    // Fetch missing meanings
    extracted.forEach((cand) => {
      if (!cand.meaning) {
        fetchSingleWordMeaning(cand.word).then((meaning) => {
          if (meaning) {
            setAsyncDefinitions((prev) => ({ ...prev, [cand.normalized]: meaning }));
          }
        });
      }
    });
  }, [appearanceSettings.vocabWarmup, words]);

  useEffect(() => {
    setIsCollapsed(appearanceSettings.vocabWarmup === "collapsed");
  }, [appearanceSettings.vocabWarmup]);

  if (appearanceSettings.vocabWarmup === "hidden" || !candidates.length) {
    return null;
  }

  const countLabel = `${candidates.length} ${candidates.length === 1 ? "word" : "words"}`;
  const subtitle = `${candidates.length} useful ${
    candidates.length === 1 ? "word was" : "words were"
  } picked from this text.`;

  return (
    <section
      id="vocabWarmup"
      className={`vocab-warmup${isCollapsed ? " is-collapsed" : ""}`}
      aria-labelledby="vocabWarmupHeading"
    >
      <div className="vocab-warmup-shell">
        <header className="vocab-warmup-header">
          <div className="vocab-warmup-lead">
            <span className="vocab-warmup-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 0 4 4.5v15" />
              </svg>
            </span>
            <div className="vocab-warmup-title-wrap">
              <div className="vocab-warmup-title-row">
                <h2 id="vocabWarmupHeading">Vocabulary preview</h2>
                <span id="vocabWarmupCount" className="vocab-warmup-count">
                  {countLabel}
                </span>
              </div>
              <p id="vocabWarmupSubtitle" className="vocab-warmup-subtitle">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="vocab-warmup-actions">
            <button
              id="toggleVocabWarmupCollapse"
              className="utility-button vocab-collapse-btn"
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <span className="collapse-label">
                {isCollapsed ? "Review words" : "Hide preview"}
              </span>
              <svg
                className="collapse-arrow"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button
              id="startReadingFromVocabBtn"
              className="vocab-start-btn"
              type="button"
              onClick={onStartReading}
            >
              <span>Start reading</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </header>

        <div id="vocabWarmupList" className="vocab-warmup-list" role="list">
          {candidates.map((item, itemIndex) => {
            const definition = item.meaning || asyncDefinitions[item.normalized] || "";
            const isSaved = Boolean(
              Object.values(studyLog).some(
                (entry) => normalizeWord(entry.word) === normalizeWord(item.word)
              )
            );

            return (
              <article
                key={item.word}
                className="vocab-card"
                role="listitem"
                data-word={item.word}
                data-index={item.index}
              >
                <span className="vocab-card-number" aria-hidden="true">
                  {String(itemIndex + 1).padStart(2, "0")}
                </span>
                <div className="vocab-card-content">
                  <div className="vocab-card-header">
                    <div className="vocab-term-row">
                      <strong className="vocab-word" lang="es">
                        {item.displayWord}
                      </strong>
                      {item.isPhrase && <span className="vocab-phrase-label">phrase</span>}
                    </div>
                    <button
                      className={`vocab-save-btn${isSaved ? " is-saved" : ""}`}
                      type="button"
                      aria-label={`${isSaved ? "Saved" : "Save"} ${item.displayWord} to study cards`}
                      title={isSaved ? "Saved to study cards" : "Save to study cards"}
                      onClick={() => {
                        const targetWord = words[item.index] || {
                          text: item.word,
                          index: item.index,
                          start: 0,
                          end: 0
                        };
                        onSaveWord(targetWord, definition || item.word);
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill={isSaved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="vocab-save-label">{isSaved ? "Saved" : "Save"}</span>
                    </button>
                  </div>
                  <p className={`vocab-meaning${definition ? "" : " is-loading"}`}>
                    {definition || "Finding a definition…"}
                  </p>
                  <p
                    className="vocab-context"
                    lang="es"
                    dangerouslySetInnerHTML={{
                      __html: `“${item.contextSentence || item.displayWord}”`
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
