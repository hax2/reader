import React, { useRef, useEffect, useState, useCallback } from "react";
import { studyEntries, downloadableStudyEntries, downloadAnkiCards } from "../utils/storage";
import { htmlToText, normalizeWord, escapeHtml } from "../utils/text";
import { speechSynthesisSupported } from "../utils/constants";
import { pronounceSpanishWord } from "../hooks/useBrowserTts";
import type { StudyLog } from "../types";

export interface AnkiReviewModalProps {
  isOpen: boolean;
  studyLog: StudyLog;
  preferredVoiceURI?: string;
  onClose: () => void;
  onUpdateEntry: (key: string, field: "word" | "meaning" | "context" | "reading", val: string) => void;
  onRemoveEntry: (key: string) => void;
}

function highlightWordInContext(context: string, targetWord: string): string {
  const cleanContext = htmlToText(context);
  if (!cleanContext) return "";
  const cleanTarget = targetWord.trim();
  if (!cleanTarget) return escapeHtml(cleanContext);
  const escaped = escapeHtml(cleanContext);
  const pattern = new RegExp(
    `(${cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  return escaped.replace(pattern, "<mark class=\"flashcard-context-mark\">$1</mark>");
}

export const AnkiReviewModal: React.FC<AnkiReviewModalProps> = ({
  isOpen,
  studyLog,
  preferredVoiceURI,
  onClose,
  onUpdateEntry,
  onRemoveEntry
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [mode, setMode] = useState<"practice" | "edit">("practice");
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredCount, setMasteredCount] = useState<number>(0);

  const entries = studyEntries(studyLog);
  const readyCount = downloadableStudyEntries(studyLog).length;
  const count = entries.length;

  const resetPracticeSession = useCallback(() => {
    const keys = studyEntries(studyLog).map(([k]) => k);
    setQueue(keys);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
  }, [studyLog]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      resetPracticeSession();
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute("open", "");
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, resetPracticeSession]);

  const activeKey = queue[currentIndex];
  const activeEntry = activeKey ? studyLog[activeKey] : undefined;
  const isSessionComplete = queue.length > 0 && currentIndex >= queue.length;

  const handleStudyAgain = useCallback(() => {
    if (!activeKey) return;
    setQueue((prev) => [...prev, activeKey]);
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  }, [activeKey]);

  const handleGotIt = useCallback(() => {
    if (!activeKey) return;
    setMasteredCount((prev) => prev + 1);
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  }, [activeKey]);

  useEffect(() => {
    if (!isOpen || mode !== "practice" || isSessionComplete || !activeEntry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowLeft" && isFlipped) {
        e.preventDefault();
        handleStudyAgain();
      } else if (e.key === "ArrowRight" && isFlipped) {
        e.preventDefault();
        handleGotIt();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        pronounceSpanishWord(activeEntry.word, preferredVoiceURI);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEntry, handleGotIt, handleStudyAgain, isFlipped, isOpen, isSessionComplete, mode, preferredVoiceURI]);

  const progressPct =
    count > 0 ? Math.min(100, Math.round((masteredCount / count) * 100)) : 0;

  return (
    <dialog
      id="ankiDialog"
      ref={dialogRef}
      className="anki-dialog"
      aria-labelledby="ankiDialogTitle"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="anki-dialog-shell">
        <header className="anki-dialog-header">
          <div>
            <p className="eyebrow">Vocabulary studio</p>
            <h2 id="ankiDialogTitle">Study &amp; export cards</h2>
            <p id="ankiDialogCount" className="muted">
              {count.toLocaleString()} {count === 1 ? "card" : "cards"} saved · {readyCount.toLocaleString()} ready to download
            </p>
          </div>

          <div className="anki-header-actions">
            {count > 0 && (
              <div className="mode-selector anki-mode-selector" role="tablist" aria-label="Study mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "practice"}
                  aria-checked={mode === "practice"}
                  onClick={() => setMode("practice")}
                >
                  Practice
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "edit"}
                  aria-checked={mode === "edit"}
                  onClick={() => setMode("edit")}
                >
                  Edit &amp; Export ({count})
                </button>
              </div>
            )}
            <button
              id="closeAnkiDialog"
              className="utility-button"
              type="button"
              aria-label="Close Anki review"
              onClick={onClose}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {mode === "practice" && count > 0 ? (
          <div className="flashcard-studio">
            <div className="flashcard-progress-bar-wrap">
              <div className="flashcard-progress-meta">
                <span>
                  {isSessionComplete
                    ? "Session complete"
                    : `Card ${Math.min(masteredCount + 1, count)} of ${count}`}
                </span>
                <span>{progressPct}% mastered</span>
              </div>
              <div className="flashcard-progress-track">
                <div
                  className="flashcard-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {isSessionComplete ? (
              <div className="flashcard-complete-card">
                <div className="flashcard-complete-badge">✓</div>
                <h3>All {count} {count === 1 ? "card" : "cards"} reviewed!</h3>
                <p className="muted">
                  You reviewed every saved vocabulary word from your readings. Practice again or export your deck for Anki.
                </p>
                <div className="flashcard-complete-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetPracticeSession}
                  >
                    Practice again
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAnkiCards(studyLog)}
                  >
                    Download Anki (.tsv)
                  </button>
                </div>
              </div>
            ) : activeEntry ? (
              <div className="flashcard-stage">
                <div
                  className={`flashcard-card${isFlipped ? " is-flipped" : ""}`}
                  onClick={() => setIsFlipped((prev) => !prev)}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    isFlipped
                      ? "Hide English meaning"
                      : "Reveal English meaning"
                  }
                >
                  <div className="flashcard-top-row">
                    {activeEntry.reading ? (
                      <span className="flashcard-story-tag">{activeEntry.reading}</span>
                    ) : (
                      <span className="flashcard-story-tag">Saved vocabulary</span>
                    )}
                    {speechSynthesisSupported && (
                      <button
                        type="button"
                        className="flashcard-audio-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          pronounceSpanishWord(activeEntry.word, preferredVoiceURI);
                        }}
                        title={`Pronounce “${activeEntry.word}” (P)`}
                        aria-label={`Pronounce ${activeEntry.word}`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                        <span>Listen</span>
                      </button>
                    )}
                  </div>

                  <div className="flashcard-main">
                    <h3 className="flashcard-term" lang="es">
                      {activeEntry.word}
                    </h3>
                    {activeEntry.context && (
                      <p
                        className="flashcard-context"
                        lang="es"
                        dangerouslySetInnerHTML={{
                          __html: `“${highlightWordInContext(
                            activeEntry.context,
                            activeEntry.word
                          )}”`
                        }}
                      />
                    )}
                  </div>

                  <div className="flashcard-answer-area">
                    {isFlipped ? (
                      <div className="flashcard-meaning-box">
                        <span className="flashcard-meaning-label">English meaning</span>
                        <p className="flashcard-meaning-text">
                          {activeEntry.meaning || "No translation saved"}
                        </p>
                      </div>
                    ) : (
                      <p className="flashcard-flip-hint">
                        Tap card or press <kbd>Space</kbd> to reveal English meaning
                      </p>
                    )}
                  </div>
                </div>

                <div className="flashcard-controls">
                  {!isFlipped ? (
                    <button
                      type="button"
                      className="flashcard-reveal-btn"
                      onClick={() => setIsFlipped(true)}
                    >
                      Reveal meaning
                    </button>
                  ) : (
                    <div className="flashcard-grade-buttons">
                      <button
                        type="button"
                        className="secondary-button flashcard-again-btn"
                        onClick={handleStudyAgain}
                      >
                        Study again
                      </button>
                      <button
                        type="button"
                        className="flashcard-gotit-btn"
                        onClick={handleGotIt}
                      >
                        Got it — next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div id="ankiCardList" className="anki-card-list">
            {entries.map(([key, entry]) => (
              <article key={key} className="anki-card-editor" data-study-key={key}>
                <div className="anki-card-editor-header">
                  <strong>{entry.word || "Untitled word"}</strong>
                  <div className="anki-card-header-btns">
                    {speechSynthesisSupported && entry.word && (
                      <button
                        className="secondary-button anki-pronounce-btn"
                        type="button"
                        onClick={() => pronounceSpanishWord(entry.word, preferredVoiceURI)}
                        title={`Pronounce ${entry.word}`}
                      >
                        Listen
                      </button>
                    )}
                    <button
                      className="remove-card-button"
                      type="button"
                      data-remove-card={key}
                      aria-label={`Remove ${entry.word || "card"} from Anki export`}
                      onClick={() => {
                        onRemoveEntry(key);
                        setQueue((prev) => prev.filter((k) => k !== key));
                        if (entries.length <= 1) onClose();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="anki-card-fields">
                  <label>
                    <span>Clicked word</span>
                    <input
                      data-field="word"
                      value={entry.word || ""}
                      onChange={(e) => onUpdateEntry(key, "word", e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Translated phrase</span>
                    <textarea
                      data-field="meaning"
                      rows={2}
                      value={entry.meaning || ""}
                      onChange={(e) => onUpdateEntry(key, "meaning", e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Spanish context</span>
                    <textarea
                      data-field="context"
                      rows={2}
                      value={htmlToText(entry.context || "")}
                      onChange={(e) => onUpdateEntry(key, "context", htmlToText(e.target.value))}
                    />
                  </label>
                  <label>
                    <span>Reading</span>
                    <input
                      data-field="reading"
                      value={entry.reading || ""}
                      onChange={(e) => onUpdateEntry(key, "reading", e.target.value)}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="anki-dialog-footer">
          <button
            id="cancelAnkiReview"
            className="secondary-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
          <button
            id="downloadReviewedAnki"
            type="button"
            disabled={readyCount === 0}
            onClick={() => {
              downloadAnkiCards(studyLog);
              onClose();
            }}
          >
            Download Anki cards (.tsv)
          </button>
        </footer>
      </div>
    </dialog>
  );
};
export { normalizeWord };
