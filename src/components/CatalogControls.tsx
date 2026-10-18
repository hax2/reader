import React from "react";
import { difficultyOrder, collectionOptions, difficultyLabels } from "../utils/constants";
import type { CatalogSettings } from "../types";

export interface CatalogControlsProps {
  settings: CatalogSettings;
  totalCount: number;
  filteredCount: number;
  onUpdateSettings: (updater: (prev: CatalogSettings) => CatalogSettings) => void;
}

export function updateLevelFilters(
  levelFilters: HTMLElement[],
  activeLevel: string
): void {
  levelFilters.forEach((button) => {
    const selected = button.dataset.level === activeLevel;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function updateCollectionTabs(
  collectionTabs: HTMLElement[],
  activeCollection: string
): void {
  collectionTabs.forEach((button) => {
    const selected = button.dataset.collection === activeCollection;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}

const collectionTitles: Record<string, string> = {
  all: "All",
  stories: "Stories",
  bible: "Bible",
  "greek-classics": "Greek Classics",
  "don-quijote": "Don Quijote",
  "my-books": "My Books"
};

export const CatalogControls: React.FC<CatalogControlsProps> = ({
  settings,
  totalCount,
  filteredCount,
  onUpdateSettings
}) => {
  const selectCollection = (col: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      collection: (collectionOptions as readonly string[]).includes(col) ? col : "all"
    }));
  };

  const selectLevel = (level: string) => {
    onUpdateSettings((prev) => ({ ...prev, level }));
  };

  const countLabel = `${filteredCount.toLocaleString()} ${filteredCount === 1 ? "reading" : "readings"}`;
  const summaryText = filteredCount === totalCount ? countLabel : `${countLabel} of ${totalCount}`;

  return (
    <div className="catalog-filters-shell">
      <div className="collection-tabs" role="tablist" aria-label="Collections">
        {collectionOptions.map((col) => {
          const isSelected = settings.collection === col;
          return (
            <button
              key={col}
              id={`collection-${col}`}
              type="button"
              role="tab"
              className={`collection-tab${isSelected ? " is-selected" : ""}`}
              aria-selected={isSelected ? "true" : "false"}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectCollection(col)}
              data-collection={col}
            >
              {collectionTitles[col] || col}
            </button>
          );
        })}
      </div>

      <div className="level-filters" role="group" aria-label="Reading difficulty">
        <button
          type="button"
          className={`level-filter${settings.level === "all" ? " is-selected" : ""}`}
          aria-pressed={settings.level === "all" ? "true" : "false"}
          onClick={() => selectLevel("all")}
          data-level="all"
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
              aria-pressed={isSelected ? "true" : "false"}
              onClick={() => selectLevel(level)}
              data-level={level}
            >
              <span className="level-badge">{level}</span>
              <span>{difficultyLabels[level]}</span>
            </button>
          );
        })}
      </div>

      <p id="catalogSummary" className="catalog-summary" aria-live="polite">
        {summaryText}
      </p>
    </div>
  );
};
