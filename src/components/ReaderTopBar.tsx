import React from "react";
import type { Track, ReaderMode } from "../types";

export interface ReaderTopBarProps {
  track: Track | null;
  readerMode: ReaderMode;
  passagesAvailable: boolean;
  isTextOnly: boolean;
  onBackToLibrary: () => void;
  onSelectReaderMode: (mode: ReaderMode) => void;
  onOpenAppearance: () => void;
}

export const ReaderTopBar: React.FC<ReaderTopBarProps> = ({
  track,
  readerMode,
  passagesAvailable,
  isTextOnly,
  onBackToLibrary,
  onSelectReaderMode,
  onOpenAppearance
}) => {
  return (
    <header className="reader-topbar">
      <button
        id="backToLibrary"
        className="utility-button"
        type="button"
        aria-label="Back to readings"
        onClick={onBackToLibrary}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <div className="title-wrap">
        <h1 id="app-title">{track?.title || "Pick a reading above"}</h1>
      </div>

      <div className="reader-controls">
        <div id="readerModeSelector" className="reader-mode-selector" role="radiogroup" aria-label="Reading mode">
          <button
            type="button"
            role="radio"
            className="reader-mode-btn"
            data-reader-mode="listen"
            aria-checked={readerMode === "listen"}
            tabIndex={readerMode === "listen" ? 0 : -1}
            onClick={() => onSelectReaderMode("listen")}
            title={isTextOnly ? "Listen with a browser voice" : undefined}
          >
            Listen
          </button>
          <button
            type="button"
            role="radio"
            className="reader-mode-btn"
            data-reader-mode="passages"
            aria-checked={readerMode === "passages"}
            tabIndex={readerMode === "passages" ? 0 : -1}
            disabled={!passagesAvailable}
            title={!passagesAvailable ? "Needs audio with synced word timings" : undefined}
            onClick={() => onSelectReaderMode("passages")}
          >
            Passages
          </button>
          <button
            type="button"
            role="radio"
            className="reader-mode-btn"
            data-reader-mode="read"
            aria-checked={readerMode === "read"}
            tabIndex={readerMode === "read" ? 0 : -1}
            onClick={() => onSelectReaderMode("read")}
          >
            Read
          </button>
        </div>

        <button
          id="appearanceToggle"
          className="utility-button"
          type="button"
          aria-label="Reading appearance settings"
          title="Reading appearance settings"
          onClick={onOpenAppearance}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
