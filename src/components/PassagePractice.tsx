import React from "react";

export interface PassagePracticeProps {
  passageIndex: number;
  totalPassages: number;
  passageRevealed: boolean;
  passageStatusText?: string;
  onToggleReveal: () => void;
  onReplay: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const PassagePractice: React.FC<PassagePracticeProps> = ({
  passageIndex,
  totalPassages,
  passageRevealed,
  passageStatusText,
  onToggleReveal,
  onReplay,
  onPrevious,
  onNext
}) => {
  const currentNum = passageIndex >= 0 ? passageIndex + 1 : 1;
  const label = `Passage ${currentNum} of ${totalPassages || 1}`;

  return (
    <section id="passagePractice" className="passage-practice" aria-labelledby="passageHeading">
      <header className="passage-header">
        <div>
          <p className="eyebrow">Focused listening</p>
          <h2 id="passageHeading" tabIndex={-1}>
            {label}
          </h2>
        </div>
        <button
          id="revealPassage"
          className="passage-reveal"
          type="button"
          aria-pressed={passageRevealed}
          onClick={onToggleReveal}
        >
          {passageRevealed ? "Hide Spanish" : "Reveal Spanish"}
        </button>
      </header>

      <p id="passagePrompt" className="passage-prompt">
        {passageRevealed
          ? "Tap any word for its meaning. Hide the text before your next attempt."
          : "Listen without reading. Replay as often as you need."}
      </p>

      <div className="passage-actions" role="group" aria-label="Passage controls">
        <button
          id="previousPassage"
          type="button"
          disabled={passageIndex <= 0}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          id="replayPassage"
          className="passage-primary"
          type="button"
          onClick={onReplay}
        >
          Listen again
        </button>
        <button
          id="nextPassage"
          type="button"
          disabled={passageIndex >= totalPassages - 1}
          onClick={onNext}
        >
          Got it — next
        </button>
      </div>

      <p id="passageStatus" className="visually-hidden" role="status" aria-live="polite">
        {passageStatusText || `${label}.`}
      </p>
    </section>
  );
};
