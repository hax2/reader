import React, { useRef, useEffect } from "react";
import { studyEntries, downloadableStudyEntries, downloadAnkiCards } from "../utils/storage";
import { htmlToText, normalizeWord } from "../utils/text";
import type { StudyLog } from "../types";

export interface AnkiReviewModalProps {
  isOpen: boolean;
  studyLog: StudyLog;
  onClose: () => void;
  onUpdateEntry: (key: string, field: "word" | "meaning" | "context" | "reading", val: string) => void;
  onRemoveEntry: (key: string) => void;
}

export const AnkiReviewModal: React.FC<AnkiReviewModalProps> = ({
  isOpen,
  studyLog,
  onClose,
  onUpdateEntry,
  onRemoveEntry
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
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
  }, [isOpen]);

  const entries = studyEntries(studyLog);
  const readyCount = downloadableStudyEntries(studyLog).length;
  const count = entries.length;

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
        </header>

        <div id="ankiCardList" className="anki-card-list">
          {entries.map(([key, entry]) => (
            <article key={key} className="anki-card-editor" data-study-key={key}>
              <div className="anki-card-editor-header">
                <strong>{entry.word || "Untitled word"}</strong>
                <button
                  className="remove-card-button"
                  type="button"
                  data-remove-card={key}
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
            Download Anki cards
          </button>
        </footer>
      </div>
    </dialog>
  );
};
export { normalizeWord };
