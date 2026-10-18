import React, { useRef } from "react";
import { AppearanceModal } from "./AppearanceModal";
import type { Track, ReaderMode, AppearanceSettings } from "../types";

export interface ReaderTopBarProps {
  track: Track | null;
  customTitle?: string;
  readerMode: ReaderMode;
  passagesAvailable: boolean;
  isTextOnly: boolean;
  appearanceSettings: AppearanceSettings;
  progressPercent?: number;
  onBackToLibrary: () => void;
  onSelectReaderMode: (mode: ReaderMode) => void;
  onUpdateAppearance: (updater: (prev: AppearanceSettings) => AppearanceSettings) => void;
  onOpenOnboarding: () => void;
}

const MODE_ORDER: ReaderMode[] = ["listen", "passages", "read"];

export const ReaderTopBar: React.FC<ReaderTopBarProps> = ({
  track,
  customTitle,
  readerMode,
  passagesAvailable,
  isTextOnly,
  appearanceSettings,
  progressPercent = 0,
  onBackToLibrary,
  onSelectReaderMode,
  onUpdateAppearance,
  onOpenOnboarding
}) => {
  const modeBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleModeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const currentIdx = Math.max(0, MODE_ORDER.indexOf(readerMode));
    const nextIdx =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? MODE_ORDER.length - 1
          : (currentIdx + (e.key === "ArrowRight" ? 1 : -1) + MODE_ORDER.length) % MODE_ORDER.length;
    modeBtnRefs.current[nextIdx]?.focus();
    onSelectReaderMode(MODE_ORDER[nextIdx]);
  };

  const clampedProgress = Math.max(0, Math.min(100, progressPercent));

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
        <h1 id="app-title">{customTitle || track?.title || "Pick a reading above"}</h1>
      </div>

      <div
        id="readerModeSelector"
        className="mode-selector"
        role="radiogroup"
        aria-label="Reader mode"
        onKeyDown={handleModeKeyDown}
      >
        <button
          ref={(el) => {
            modeBtnRefs.current[0] = el;
          }}
          type="button"
          role="radio"
          data-reader-mode="listen"
          aria-checked={readerMode === "listen"}
          tabIndex={readerMode === "listen" ? 0 : -1}
          title={isTextOnly ? "Listen with a browser voice" : undefined}
          onClick={() => onSelectReaderMode("listen")}
        >
          Listen
        </button>
        <button
          ref={(el) => {
            modeBtnRefs.current[1] = el;
          }}
          type="button"
          role="radio"
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
          ref={(el) => {
            modeBtnRefs.current[2] = el;
          }}
          type="button"
          role="radio"
          data-reader-mode="read"
          aria-checked={readerMode === "read"}
          tabIndex={readerMode === "read" ? 0 : -1}
          onClick={() => onSelectReaderMode("read")}
        >
          Read
        </button>
      </div>

      <AppearanceModal
        settings={appearanceSettings}
        onUpdateSettings={onUpdateAppearance}
        onOpenOnboarding={onOpenOnboarding}
      />

      <div className="reader-topbar-progress" aria-hidden="true">
        <div
          className="reader-topbar-progress-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </header>
  );
};
