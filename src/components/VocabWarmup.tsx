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
    if (appearanceSettings.vocabWarmup === "off" || !words || words.length < 15) {
      setCandidates([]);
      return;
    }
    const extracted = extractUncommonVocab(words);
    setCandidates(extracted);
    setAsyncDefinitions({});

    let active = true;
    extracted.forEach((cand) => {
      if (!cand.meaning) {
        fetchSingleWordMeaning(cand.word)
          .then((meaning) => {
            if (!active) return;
            setAsyncDefinitions((prev) => ({
              ...prev,
              [cand.normalized]: meaning || "Definition available in the text."
            }));
          })
          .catch(() => {
            if (!active) return;
            setAsyncDefinitions((prev) => ({
              ...prev,
              [cand.normalized]: "Tap word in reader for definition"
            }));
          });
      }
    });
    return () => {
      active = false;
    };
  }, [appearanceSettings.vocabWarmup, words]);

  useEffect(() => {
    setIsCollapsed(appearanceSettings.vocabWarmup === "collapsed");
  }, [appearanceSettings.vocabWarmup]);

  if (appearanceSettings.vocabWarmup === "off" || !candidates.length) {
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
              <p className="vocab-warmup-eyebrow">Before you read</p>
              <div className="vocab-warmup-heading-row">
                <h2 id="vocabWarmupHeading" className="vocab-warmup-heading">
                  Vocabulary preview
                </h2>
                <span id="vocabWarmupCount" className="vocab-warmup-count">
                  {countLabel}
                </span>
              </div>
              <p id="vocabWarmupSubtitle" className="vocab-warmup-subtitle">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            id="toggleVocabWarmupCollapse"
            className="vocab-collapse-btn"
            type="button"
            aria-expanded={!isCollapsed}
            aria-controls="vocabWarmupBody"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <span className="collapse-label">
              {isCollapsed ? "Review words" : "Hide preview"}
            </span>
            <svg
              className="chevron-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </header>

        <div id="vocabWarmupBody" className="vocab-warmup-body">
          <p className="vocab-warmup-instruction">
            Scan these now, or keep going and tap any word in the story when you need help.
          </p>
          <div id="vocabWarmupList" className="vocab-cards-grid" role="list">
            {candidates.map((item, itemIndex) => {
              const definition = item.meaning || asyncDefinitions[item.normalized] || "";
              const isSaved = Boolean(
                Object.values(studyLog).some(
                  (entry) => normalizeWord(entry.word) === normalizeWord(item.word)
                )
              );

              return (
                <article
                  key={`${item.word}-${item.index}`}
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
          <footer className="vocab-warmup-footer">
            <span className="vocab-warmup-hint">
              Nothing to memorize — this is just a head start.
            </span>
            <button
              id="startReadingFromVocabBtn"
              className="vocab-start-reading-btn"
              type="button"
              onClick={onStartReading}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              <span>Start reading</span>
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
};
