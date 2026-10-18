import React from "react";
import { studyEntries, downloadableStudyEntries, downloadAnkiCards } from "../utils/storage";
import type { StudyLog } from "../types";

export interface AnkiReviewModalProps {
  isOpen: boolean;
  studyLog: StudyLog;
  onClose: () => void;
  onUpdateEntry: (key: string, field: "word" | "meaning" | "context" | "reading", val: string) => void;
  onRemoveEntry: (key: string) => void;
}

export function updateAnkiReviewCount(studyLog: StudyLog): { count: number; readyCount: number } {
  const count = studyEntries(studyLog).length;
  const readyCount = downloadableStudyEntries(studyLog).length;
  return { count, readyCount };
}

export function openAnkiReview(onOpen?: () => void): void {
  onOpen?.();
}

export const AnkiReviewModal: React.FC<AnkiReviewModalProps> = ({
  isOpen,
  studyLog,
  onClose,
  onUpdateEntry,
  onRemoveEntry
}) => {
  if (!isOpen) return null;

  const entries = studyEntries(studyLog);
  const readyCount = downloadableStudyEntries(studyLog).length;
  const count = entries.length;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <dialog
        id="ankiDialog"
        className="anki-dialog is-open"
        open
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="ankiDialogTitle"
      >
        <div className="anki-dialog-shell">
          <header className="anki-dialog-header">
            <div>
              <p className="eyebrow">Anki export</p>
              <h2 id="ankiDialogTitle">Review your cards</h2>
              <p id="ankiDialogCount" className="muted">
                {count.toLocaleString()} {count === 1 ? "card" : "cards"} saved · {readyCount.toLocaleString()} ready to download
              </p>
            </div>
            <button
              id="closeAnkiDialog"
              className="utility-button"
              type="button"
              aria-label="Close Anki review"
              onClick={onClose}
            >
              ✕
            </button>
          </header>

          <div id="ankiCardList" className="anki-card-list">
            {entries.map(([key, entry]) => (
              <article key={key} className="anki-card-editor" data-study-key={key}>
                <div className="anki-card-editor-header">
                  <strong>{entry.word || "Untitled word"}</strong>
                  <button
                    className="remove-card-button"
                    type="button"
                    aria-label={`Remove ${entry.word || "card"} from Anki export`}
                    onClick={() => {
                      onRemoveEntry(key);
                      if (entries.length <= 1) onClose();
                    }}
                  >
                    Remove
                  </button>
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
                      value={entry.context || ""}
                      onChange={(e) => onUpdateEntry(key, "context", e.target.value)}
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

          <footer className="anki-dialog-footer">
            <button
              id="cancelAnkiReview"
              className="secondary-btn"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
            <button
              id="downloadReviewedAnki"
              className="primary-btn"
              type="button"
              disabled={readyCount === 0}
              onClick={() => {
                downloadAnkiCards(studyLog);
                onClose();
              }}
            >
              Download Anki TSV ({readyCount})
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
};
