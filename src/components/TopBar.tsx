import React from "react";

export interface TopBarProps {
  studyCardCount?: number;
  onOpenAddBook: () => void;
  onOpenOnboarding: () => void;
  onOpenAnkiReview?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  studyCardCount = 0,
  onOpenAddBook,
  onOpenOnboarding,
  onOpenAnkiReview
}) => {
  return (
    <header className="topbar">
      <div className="topbar-main">
        <h1 id="library-title" className="visually-hidden">
          Readings
        </h1>
      </div>
      <div className="topbar-actions">
        {studyCardCount > 0 && onOpenAnkiReview && (
          <button
            id="openLibraryStudyBtn"
            className="onboarding-launch-btn study-launch-btn"
            type="button"
            onClick={onOpenAnkiReview}
          >
            <svg
              width="17"
              height="17"
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
            <span>
              Study cards <span className="study-badge-count">{studyCardCount}</span>
            </span>
          </button>
        )}
        <button
          id="addBookBtn"
          className="add-book-btn"
          type="button"
          onClick={onOpenAddBook}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 0 4 4.5v15" />
            <line x1="13" y1="7" x2="13" y2="13" />
            <line x1="10" y1="10" x2="16" y2="10" />
          </svg>
          <span>Add a book</span>
        </button>
        <button
          id="openOnboardingBtn"
          className="onboarding-launch-btn"
          type="button"
          aria-label="Open reading preferences"
          onClick={onOpenOnboarding}
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Preferences</span>
        </button>
      </div>
    </header>
  );
};
