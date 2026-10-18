import React, { useRef } from "react";
import { difficultyOrder, collectionOptions } from "../utils/constants";
import type { CatalogSettings } from "../types";

export interface CatalogControlsProps {
  settings: CatalogSettings;
  totalCount: number;
  filteredCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onUpdateSettings: (updater: (prev: CatalogSettings) => CatalogSettings) => void;
}

const collectionTitles: Record<string, string> = {
  all: "All readings",
  stories: "Stories",
  bible: "Bible",
  "greek-classics": "Greek classics",
  "don-quijote": "Don Quijote",
  "my-books": "My books"
};

export const CatalogControls: React.FC<CatalogControlsProps> = ({
  settings,
  totalCount,
  filteredCount,
  searchInputRef,
  onUpdateSettings
}) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectCollection = (col: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      collection: (collectionOptions as readonly string[]).includes(col) ? col : "all"
    }));
  };

  const selectLevel = (level: string) => {
    onUpdateSettings((prev) => ({ ...prev, level }));
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let nextIndex =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? collectionOptions.length - 1
          : index + (e.key === "ArrowRight" ? 1 : -1);
    nextIndex = (nextIndex + collectionOptions.length) % collectionOptions.length;
    selectCollection(collectionOptions[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  const countLabel = `${filteredCount.toLocaleString()} ${filteredCount === 1 ? "reading" : "readings"}`;
  const summaryText =
    totalCount === 0
      ? "No readings available"
      : filteredCount === totalCount
        ? countLabel
        : `${countLabel} of ${totalCount}`;

  return (
    <>
      <div className="collection-tabs" role="tablist" aria-label="Choose a library collection">
        {collectionOptions.map((col, idx) => {
          const isSelected = settings.collection === col;
          return (
            <button
              key={col}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              id={`collection-${col}`}
              type="button"
              className={`collection-tab${isSelected ? " is-selected" : ""}`}
              role="tab"
              aria-selected={isSelected ? "true" : "false"}
              aria-controls="trackList"
              tabIndex={isSelected ? 0 : -1}
              data-collection={col}
              onClick={() => selectCollection(col)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
            >
              {collectionTitles[col] || col}
            </button>
          );
        })}
      </div>

      <div className="catalog-tools" role="search" aria-label="Find a reading">
        <label className="search-field">
          <span className="visually-hidden">Search readings or authors</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            id="librarySearch"
            ref={searchInputRef}
            type="search"
            placeholder="Search readings or authors"
            autoComplete="off"
            value={settings.search}
            onChange={(e) => onUpdateSettings((prev) => ({ ...prev, search: e.target.value }))}
          />
        </label>

        <label className="catalog-select">
          <span>Format</span>
          <select
            id="formatFilter"
            value={settings.format}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                format: e.target.value as CatalogSettings["format"]
              }))
            }
          >
            <option value="all">All formats</option>
            <option value="listen">Listen &amp; read</option>
            <option value="read">Read only</option>
          </select>
        </label>

        <label className="catalog-select">
          <span>Arrange</span>
          <select
            id="librarySort"
            value={settings.sort}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                sort: e.target.value as CatalogSettings["sort"]
              }))
            }
          >
            <option value="difficulty">Reading level</option>
            <option value="title">Title A–Z</option>
            <option value="author">Author A–Z</option>
            <option value="length">Shortest first</option>
          </select>
        </label>
      </div>

      <div className="level-filters" aria-label="Filter by reading level">
        <button
          type="button"
          className={`level-filter${settings.level === "all" ? " is-selected" : ""}`}
          data-level="all"
          aria-pressed={settings.level === "all" ? "true" : "false"}
          onClick={() => selectLevel("all")}
        >
          All levels
        </button>
        {difficultyOrder.map((level) => {
          const isSelected = settings.level === level;
          return (
            <button
              key={level}
              type="button"
              className={`level-filter${isSelected ? " is-selected" : ""}`}
              data-level={level}
              aria-pressed={isSelected ? "true" : "false"}
              onClick={() => selectLevel(level)}
            >
              {level}
            </button>
          );
        })}
      </div>

      <p id="catalogSummary" className="catalog-summary" aria-live="polite">
        {summaryText}
      </p>
    </>
  );
};
