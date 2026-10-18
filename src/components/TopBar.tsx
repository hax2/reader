import React from "react";
import type { CatalogSettings } from "../types";

export interface TopBarProps {
  settings: CatalogSettings;
  studyCardCount: number;
  onUpdateSettings: (updater: (prev: CatalogSettings) => CatalogSettings) => void;
  onOpenAddBook: () => void;
  onOpenAnkiReview: () => void;
  onOpenOnboarding: () => void;
}

export function updateStudyControls(studyCardCount: number): { label: string; disabled: boolean } {
  const label = `${studyCardCount.toLocaleString()} looked-up ${studyCardCount === 1 ? "word" : "words"}`;
  return { label, disabled: studyCardCount === 0 };
}

export const TopBar: React.FC<TopBarProps> = ({
  settings,
  studyCardCount,
  onUpdateSettings,
  onOpenAddBook,
  onOpenAnkiReview,
  onOpenOnboarding
}) => {
  return (
    <header className="topbar">
      <div className="topbar-main">
        <h1 id="library-title" className="visually-hidden">
          Readings
        </h1>
        <div className="search-wrap">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="librarySearch"
            type="search"
            placeholder="Search titles, authors, genres…"
            value={settings.search}
            onChange={(e) => onUpdateSettings((prev) => ({ ...prev, search: e.target.value }))}
            aria-label="Search catalog"
          />
        </div>

        <div className="filter-select-group">
          <select
            id="formatFilter"
            value={settings.format}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                format: e.target.value as CatalogSettings["format"]
              }))
            }
            aria-label="Filter by format"
          >
            <option value="all">All formats</option>
            <option value="listen">Listen & read</option>
            <option value="read">Read only</option>
          </select>

          <select
            id="librarySort"
            value={settings.sort}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                sort: e.target.value as CatalogSettings["sort"]
              }))
            }
            aria-label="Sort library"
          >
            <option value="difficulty">Sort by difficulty</option>
            <option value="title">Sort by title</option>
            <option value="author">Sort by author</option>
            <option value="length">Sort by length</option>
          </select>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          id="addBookBtn"
          className="add-book-btn"
          type="button"
          onClick={onOpenAddBook}
          aria-label="Add a book"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add book</span>
        </button>

        <button
          id="downloadAnki"
          className="study-count"
          type="button"
          disabled={studyCardCount === 0}
          onClick={onOpenAnkiReview}
          aria-label="Review and export Anki cards"
          title={studyCardCount === 0 ? "Look up words in any reading to create Anki cards" : "Review study cards"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span id="studyCount">
            {studyCardCount.toLocaleString()} {studyCardCount === 1 ? "card" : "cards"}
          </span>
        </button>

        <button
          id="openOnboardingBtn"
          className="utility-button"
          type="button"
          onClick={onOpenOnboarding}
          aria-label="Open reading preferences tutorial"
          title="Reading preferences & tutorial"
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
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </div>
    </header>
  );
};
