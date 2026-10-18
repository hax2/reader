import React from "react";
import { difficultyOrder, difficultyLabels } from "../utils/constants";
import { difficultyDescription, normalizeSearch, compareTracks } from "../utils/text";
import { TrackCard } from "./TrackCard";
import type { Track, CatalogSettings, ProgressCache } from "../types";

export interface TrackListProps {
  tracks: Track[];
  personalBooks: Track[];
  activeTrackId: string;
  catalogSettings: CatalogSettings;
  progressCache: ProgressCache;
  onSelectTrack: (track: Track) => void;
  onDeletePersonalBook: (track: Track) => void;
  onOpenAddBook: () => void;
  onClearFilters: () => void;
}

export function getVisibleTracks(tracks: Track[], catalogSettings: CatalogSettings): Track[] {
  const query = normalizeSearch(catalogSettings.search);
  return tracks
    .filter((track) => {
      if (catalogSettings.collection !== "all" && track.collection !== catalogSettings.collection) return false;
      if (catalogSettings.level !== "all" && track.difficulty !== catalogSettings.level) return false;
      if (catalogSettings.format === "listen" && !track.audio) return false;
      if (catalogSettings.format === "read" && track.audio) return false;
      if (!query) return true;
      return normalizeSearch(
        [
          track.title,
          track.author,
          track.genre,
          track.description,
          track.collection === "bible"
            ? "biblia bible escritura scripture"
            : track.collection === "greek-classics"
              ? "clasicos clásicos griegos grecia greek classics philosophy filosofía mythology mitologia mitología"
              : track.collection === "don-quijote"
                ? "quijote quixote cervantes mancha sancho panza novela novel"
                : track.collection === "my-books"
                  ? "mis libros my books personal private"
                  : "cuentos stories relatos",
          ...(Array.isArray(track.tags) ? track.tags : [])
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(query);
    })
    .sort((a, b) => compareTracks(a, b, catalogSettings.sort));
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  personalBooks,
  activeTrackId,
  catalogSettings,
  progressCache,
  onSelectTrack,
  onDeletePersonalBook,
  onOpenAddBook,
  onClearFilters
}) => {
  if (!tracks.length) {
    return (
      <div id="trackList" className="track-list" role="tabpanel">
        <p className="muted">No hosted readings found.</p>
      </div>
    );
  }

  const query = normalizeSearch(catalogSettings.search);
  const visibleTracks = getVisibleTracks(tracks, catalogSettings);

  if (!visibleTracks.length) {
    if (catalogSettings.collection === "my-books" && !personalBooks.length) {
      return (
        <div id="trackList" className="track-list" role="tabpanel">
          <div className="empty-catalog">
            <h2>Your shelf is ready</h2>
            <p>Add a plain-text Spanish book to read it with the same vocabulary and translation tools.</p>
            <button type="button" onClick={onOpenAddBook}>
              Add your first book
            </button>
          </div>
        </div>
      );
    }
    return (
      <div id="trackList" className="track-list" role="tabpanel">
        <div className="empty-catalog">
          <h2>No readings match</h2>
          <p>Try another title, format, or reading level.</p>
          <button type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  const showingDefaultCatalog =
    !query &&
    catalogSettings.level === "all" &&
    catalogSettings.collection === "all" &&
    catalogSettings.format === "all" &&
    catalogSettings.sort === "difficulty";

  const continueTracks = showingDefaultCatalog
    ? tracks
        .filter((track) => {
          const saved = progressCache[track.id];
          if (track.audio) {
            return (
              (saved?.time || 0) > 0 &&
              (saved?.duration || 0) > 0 &&
              (saved?.time || 0) / (saved?.duration || 1) < 0.97
            );
          }
          return (
            (saved?.wordIndex || 0) > 0 &&
            (saved?.wordCount || 0) > 0 &&
            (saved?.wordIndex || 0) < (saved?.wordCount || 0)
          );
        })
        .sort(
          (a, b) =>
            Date.parse(progressCache[b.id]?.updatedAt || "0") -
            Date.parse(progressCache[a.id]?.updatedAt || "0")
        )
        .slice(0, 3)
    : [];

  const groups =
    catalogSettings.sort === "difficulty"
      ? difficultyOrder
          .map((level) => [level, visibleTracks.filter((track) => track.difficulty === level)] as const)
          .filter(([, items]) => items.length)
      : ([["results", visibleTracks]] as const);

  return (
    <div id="trackList" className="track-list" role="tabpanel" aria-live="polite">
      {continueTracks.length > 0 && (
        <section className="continue-group">
          <header className="difficulty-heading">
            <div>
              <h2>Continue listening</h2>
            </div>
            <p>Your latest {continueTracks.length === 1 ? "story" : "stories"}</p>
          </header>
          <div className="track-grid">
            {continueTracks.map((track) => (
              <TrackCard
                key={`continue-${track.id}`}
                track={track}
                isActive={track.id === activeTrackId}
                progress={progressCache[track.id]}
                onSelect={onSelectTrack}
                onDeletePersonalBook={onDeletePersonalBook}
              />
            ))}
          </div>
        </section>
      )}

      {groups.map(([level, groupTracks]) => (
        <section key={level} className="difficulty-group">
          {level !== "results" && (
            <header className="difficulty-heading">
              <div>
                <span className="level-mark">{level}</span>
                <h2>{difficultyLabels[level]}</h2>
              </div>
              <p>
                {difficultyDescription(level)} · {groupTracks.length}{" "}
                {groupTracks.length === 1 ? "story" : "stories"}
              </p>
            </header>
          )}
          <div className="track-grid">
            {groupTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isActive={track.id === activeTrackId}
                progress={progressCache[track.id]}
                onSelect={onSelectTrack}
                onDeletePersonalBook={onDeletePersonalBook}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
