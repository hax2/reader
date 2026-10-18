import React, { useState } from "react";
import { progressLabel, textProgressLabel } from "../utils/text";
import { speechSynthesisSupported } from "../utils/constants";
import type { Track, ProgressEntry } from "../types";

export interface TrackCardProps {
  track: Track;
  isActive: boolean;
  progress?: ProgressEntry;
  onSelect: (track: Track) => void;
  onDeletePersonalBook?: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isActive,
  progress,
  onSelect,
  onDeletePersonalBook
}) => {
  const [imageError, setImageError] = useState(false);

  const duration = progress?.duration || 0;
  const time = progress?.time || 0;
  const wordCount = progress?.wordCount || 0;
  const wordIndex = progress?.wordIndex || 0;

  const percent = track.audio
    ? duration > 0
      ? Math.min(100, Math.round((time / duration) * 100))
      : 0
    : wordCount > 0
      ? Math.min(100, Math.round((wordIndex / wordCount) * 100))
      : 0;

  const formatLabel = track.personal
    ? "My book"
    : track.audio
      ? "Listen & read"
      : speechSynthesisSupported
        ? "Browser voice"
        : "Read";

  const timeLabel = track.minutes ? `${track.minutes} min` : "Short read";

  return (
    <article className={`track-card-shell${track.personal ? " is-personal" : ""}`}>
      <button
        type="button"
        className={`track-card${isActive ? " active" : ""}`}
        data-track-id={track.id}
        aria-current={isActive ? "true" : undefined}
        style={{ ["--progress" as string]: `${percent}%` }}
        onClick={() => onSelect(track)}
      >
        <div className="track-cover-wrapper">
          <div className="track-cover" aria-hidden="true">
            {track.cover && !imageError ? (
              <img
                src={track.cover}
                alt=""
                width={848}
                height={1264}
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="track-cover-placeholder">
                <span>{track.title}</span>
              </div>
            )}
          </div>
          <span className="track-progress" aria-hidden="true">
            <span />
          </span>
        </div>
        <div className="track-info">
          <span className="track-badges">
            <span className="level-badge">{track.difficulty}</span>
            <span>{formatLabel}</span>
            <span>{timeLabel}</span>
          </span>
          <span className="track-title">{track.title}</span>
          {track.author && <span className="track-author">{track.author}</span>}
          {track.description && <span className="track-description">{track.description}</span>}
          <span className="track-progress-label">
            {track.audio ? progressLabel(progress) : textProgressLabel(progress)}
          </span>
        </div>
      </button>

      {track.personal && onDeletePersonalBook && (
        <button
          type="button"
          className="personal-book-delete"
          data-delete-personal-book={track.id}
          aria-label={`Remove ${track.title} from My books`}
          title="Remove from My books"
          onClick={(e) => {
            e.stopPropagation();
            onDeletePersonalBook(track);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M8 6V4h8v2" />
          </svg>
        </button>
      )}
    </article>
  );
};
