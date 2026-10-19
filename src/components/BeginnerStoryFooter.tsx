import React, { useState, useEffect } from "react";
import type { Track } from "../types";
import { getBeginnerStoryEnhancement, isBeginnerTrack } from "../utils/beginnerStories";

export interface BeginnerStoryFooterProps {
  track: Track;
  allTracks: Track[];
  onSelectTrack: (track: Track) => void;
}

export const BeginnerStoryFooter: React.FC<BeginnerStoryFooterProps> = ({
  track,
  allTracks,
  onSelectTrack
}) => {
  const enhancement = getBeginnerStoryEnhancement(track, 6);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showEnglishHints, setShowEnglishHints] = useState<boolean>(false);

  useEffect(() => {
    setSelectedAnswers({});
    setShowEnglishHints(false);
  }, [track.id]);

  if (!enhancement) return null;

  const quiz = enhancement.quiz || [];
  const nextStories = allTracks
    .filter((t) => isBeginnerTrack(t) && t.id !== track.id)
    .sort((a, b) => {
      if (a.difficulty === track.difficulty && b.difficulty !== track.difficulty) return -1;
      if (b.difficulty === track.difficulty && a.difficulty !== track.difficulty) return 1;
      return (a.minutes || 5) - (b.minutes || 5);
    })
    .slice(0, 2);

  const correctCount = quiz.reduce((acc, q, qIdx) => {
    const picked = selectedAnswers[qIdx];
    if (picked !== undefined && q.options[picked]?.correct) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <section className="beginner-story-footer" aria-label="Story recap and next reading">
      {enhancement.moral && (
        <div className="beginner-moral-card">
          <div className="beginner-moral-badge">
            <span aria-hidden="true">✨</span>
            <span>{enhancement.moral.labelEs}</span>
          </div>
          <blockquote className="beginner-moral-quote" lang="es">
            {enhancement.moral.quoteEs}
          </blockquote>
          <p className="beginner-moral-translation">{enhancement.moral.quoteEn}</p>
        </div>
      )}

      {quiz.length > 0 && (
        <div className="beginner-quiz-card">
          <div className="beginner-quiz-header">
            <div>
              <span className="beginner-quiz-eyebrow">Comprobación rápida · Story Check</span>
              <h3>¿Qué pasó en la historia?</h3>
            </div>
            <div className="beginner-quiz-actions">
              <button
                type="button"
                className="beginner-hint-toggle"
                onClick={() => setShowEnglishHints((prev) => !prev)}
                aria-pressed={showEnglishHints}
              >
                {showEnglishHints ? "Hide English hints" : "Show English hints"}
              </button>
              <span className="beginner-quiz-score">
                {correctCount}/{quiz.length}
              </span>
            </div>
          </div>

          <div className="beginner-quiz-list">
            {quiz.map((q, qIdx) => {
              const pickedIdx = selectedAnswers[qIdx];
              const isAnswered = pickedIdx !== undefined;
              const isCorrect = isAnswered && Boolean(q.options[pickedIdx]?.correct);

              return (
                <div key={qIdx} className="beginner-quiz-item">
                  <p className="beginner-quiz-question" lang="es">
                    <span className="beginner-quiz-num">{qIdx + 1}.</span> {q.questionEs}
                  </p>
                  {showEnglishHints && (
                    <p className="beginner-quiz-question-en">{q.questionEn}</p>
                  )}

                  <div className="beginner-quiz-options">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = pickedIdx === optIdx;
                      let stateClass = "";
                      if (isSelected) {
                        stateClass = opt.correct ? " is-correct" : " is-wrong";
                      } else if (isCorrect && opt.correct) {
                        stateClass = " is-correct";
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={`beginner-quiz-opt${stateClass}`}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [qIdx]: optIdx
                            }))
                          }
                        >
                          <span className="beginner-opt-indicator" aria-hidden="true">
                            {isSelected ? (opt.correct ? "✓" : "✕") : String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="beginner-opt-text">
                            <span lang="es">{opt.es}</span>
                            {showEnglishHints && (
                              <small className="beginner-opt-en">{opt.en}</small>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <p className={`beginner-quiz-feedback ${isCorrect ? "is-correct" : "is-retry"}`}>
                      {isCorrect
                        ? `¡Muy bien! ${q.explanation}`
                        : "Casi — prueba otra respuesta o revisa el párrafo en el texto."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nextStories.length > 0 && (
        <div className="beginner-next-section">
          <div className="beginner-next-header">
            <span className="beginner-quiz-eyebrow">Sigue leyendo · Up Next</span>
            <h3>Más historias para tu nivel</h3>
          </div>
          <div className="beginner-next-grid">
            {nextStories.map((nextTrack) => (
              <button
                key={nextTrack.id}
                type="button"
                className="beginner-next-card"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  onSelectTrack(nextTrack);
                }}
              >
                {nextTrack.cover && (
                  <img
                    src={nextTrack.cover}
                    alt=""
                    className="beginner-next-cover"
                    loading="lazy"
                  />
                )}
                <div className="beginner-next-info">
                  <div className="beginner-next-badges">
                    <span className={`beginner-level-pill is-${nextTrack.difficulty.toLowerCase()}`}>
                      {nextTrack.difficulty}
                    </span>
                    <span>{nextTrack.minutes || 3} min</span>
                  </div>
                  <strong>{nextTrack.title}</strong>
                  <p>{nextTrack.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
