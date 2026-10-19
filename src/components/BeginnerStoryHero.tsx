import React from "react";
import type { Track } from "../types";
import { difficultyLabels } from "../utils/constants";
import { getBeginnerStoryEnhancement } from "../utils/beginnerStories";

export interface BeginnerStoryHeroProps {
  track: Track;
  wordCount: number;
}

export const BeginnerStoryHero: React.FC<BeginnerStoryHeroProps> = ({ track, wordCount }) => {
  const enhancement = getBeginnerStoryEnhancement(track, 6);
  const levelLabel = difficultyLabels[track.difficulty] || track.difficulty;
  const totalWords = wordCount || track.wordCount || 0;

  return (
    <div id="readingMeta" className="beginner-story-hero" data-difficulty={track.difficulty}>
      {track.cover && (
        <div
          className="beginner-hero-backdrop"
          style={{ backgroundImage: `url("${track.cover}")` }}
          aria-hidden="true"
        />
      )}

      <div className="beginner-hero-inner">
        {track.cover && (
          <div className="beginner-hero-cover-wrap">
            <img
              src={track.cover}
              alt=""
              className="beginner-hero-cover"
              loading="eager"
            />
          </div>
        )}

        <div className="beginner-hero-content">
          <div className="beginner-hero-badges">
            <span className={`beginner-level-pill is-${track.difficulty.toLowerCase()}`}>
              {track.difficulty} · {levelLabel}
            </span>
            {track.genre && <span className="beginner-meta-pill">{track.genre}</span>}
            {track.minutes ? <span className="beginner-meta-pill">⏱ {track.minutes} min</span> : null}
            {totalWords > 0 && (
              <span className="beginner-meta-pill">{totalWords.toLocaleString()} words</span>
            )}
          </div>

          {enhancement?.settingBadge && (
            <p className="beginner-setting-badge">{enhancement.settingBadge}</p>
          )}

          {track.description && (
            <p className="beginner-hero-synopsis">{track.description}</p>
          )}

          {enhancement && enhancement.cast.length > 0 && (
            <div className="beginner-cast-section" aria-label="Story elements and characters">
              <span className="beginner-cast-label">En esta historia · In this story</span>
              <div className="beginner-cast-grid">
                {enhancement.cast.map((item, idx) => (
                  <div key={idx} className="beginner-cast-chip">
                    <span className="beginner-cast-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="beginner-cast-text">
                      <strong lang="es">{item.es}</strong>
                      <span>{item.en}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="beginner-hero-footer">
            {track.difficultyNote && (
              <p className="beginner-coach-tip">
                <span className="beginner-tip-icon" aria-hidden="true">💡</span>
                <span>{track.difficultyNote}</span>
              </p>
            )}
            {String(track.source || "").startsWith("https://") && (
              <a
                className="beginner-source-link"
                href={track.source}
                target="_blank"
                rel="noreferrer"
                title={track.rights || "Source edition"}
              >
                Source &amp; rights
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
