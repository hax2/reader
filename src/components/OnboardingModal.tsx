import React from "react";
import {
  DEMO_EXCERPT_WORDS,
  DEMO_TOTAL_DURATION,
  DEMO_ENGLISH_TEXT,
  type OnboardingState
} from "../hooks/useOnboardingDemo";
import { resolveTheme } from "../utils/storage";

export interface OnboardingModalProps {
  isOpen: boolean;
  state: OnboardingState;
  isPlayingDemo: boolean;
  demoCurrentTime: number;
  activeWordIndex: number;
  popoverWord: { index: number; word: string; def: string } | null;
  onClose: (saveCurrent?: boolean) => void;
  onGoToStep: (step: number) => void;
  onTogglePlayDemo: () => void;
  onWordClick: (index: number) => void;
  onHidePopover: () => void;
  onFinish: () => void;
  onUpdateState: (updater: (prev: OnboardingState) => OnboardingState) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  state,
  isPlayingDemo,
  demoCurrentTime,
  activeWordIndex,
  popoverWord,
  onClose,
  onGoToStep,
  onTogglePlayDemo,
  onWordClick,
  onHidePopover,
  onFinish,
  onUpdateState
}) => {
  if (!isOpen) return null;

  const pct = Math.min(100, Math.max(0, (demoCurrentTime / DEMO_TOTAL_DURATION) * 100));
  const curMins = Math.floor(demoCurrentTime / 60);
  const curSecs = Math.floor(demoCurrentTime % 60).toString().padStart(2, "0");
  const totMins = Math.floor(DEMO_TOTAL_DURATION / 60);
  const totSecs = Math.floor(DEMO_TOTAL_DURATION % 60).toString().padStart(2, "0");
  const timeText = `${curMins}:${curSecs} / ${totMins}:${totSecs}`;

  const resolvedTheme = resolveTheme(state.theme);

  const themeOptions = [
    { value: "system", label: "System", desc: "Matches device" },
    { value: "paper", label: "Paper", desc: "Warm & classic" },
    { value: "mist", label: "Mist", desc: "Cool gray" },
    { value: "night", label: "Night", desc: "Deep contrast" }
  ] as const;

  const fontOptions = [
    { value: "serif", label: "Serif", desc: "Literary classic" },
    { value: "sans", label: "Sans", desc: "Modern & clean" },
    { value: "accessible", label: "Accessible", desc: "High legibility" }
  ] as const;

  const translationOptions = [
    { value: "english-below", label: "Stacked", desc: "English below Spanish" },
    { value: "side-by-side", label: "Side-by-side", desc: "Parallel columns" },
    { value: "off", label: "Spanish only", desc: "Immersion reading" }
  ] as const;

  const focusOptions = [
    { value: "dim-upcoming", label: "Narration focus", desc: "Dims upcoming text" },
    { value: "all", label: "Full brightness", desc: "All text bright" }
  ] as const;

  return (
    <div className="dialog-overlay" onClick={() => onClose(false)}>
      <dialog
        id="onboardingDialog"
        className="onboarding-dialog is-open"
        open
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="onboardingDialogTitle"
      >
        <div className="onboarding-shell">
          <header className="onboarding-header">
            <div className="onboarding-title-group">
              <p className="eyebrow">Make it yours</p>
              <h2 id="onboardingDialogTitle">Reading preferences</h2>
            </div>
            <button
              id="closeOnboardingBtn"
              className="utility-button onboarding-close-btn"
              type="button"
              aria-label="Close reading preferences"
              onClick={() => onClose(false)}
            >
              ✕
            </button>
          </header>

          <div className="onboarding-step-pills">
            <button
              type="button"
              className={`step-pill${state.step === 1 ? " is-active" : state.step > 1 ? " is-completed" : ""}`}
              onClick={() => onGoToStep(1)}
            >
              1. Visuals
            </button>
            <button
              type="button"
              className={`step-pill${state.step === 2 ? " is-active" : state.step > 2 ? " is-completed" : ""}`}
              onClick={() => onGoToStep(2)}
            >
              2. Reading
            </button>
            <button
              type="button"
              className={`step-pill${state.step === 3 ? " is-active" : ""}`}
              onClick={() => onGoToStep(3)}
            >
              3. Listening
            </button>
          </div>

          <div id="onboardingBody" className="onboarding-body">
            <div className="onboarding-controls-pane">
              {/* Step 1: Visuals */}
              <div className={`onboarding-step-section${state.step === 1 ? " is-active" : ""}`}>
                <h3>Theme & Typography</h3>
                <p className="section-intro">Choose a visual style comfortable for long reading sessions.</p>

                <div className="onboarding-option-group">
                  <span className="group-label">Color Theme</span>
                  <div className="option-card-grid">
                    {themeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card${state.theme === opt.value ? " is-selected" : ""}`}
                        onClick={() => onUpdateState((prev) => ({ ...prev, theme: opt.value }))}
                      >
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="onboarding-option-group">
                  <span className="group-label">Typeface</span>
                  <div className="option-card-grid">
                    {fontOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card${state.font === opt.value ? " is-selected" : ""}`}
                        onClick={() => onUpdateState((prev) => ({ ...prev, font: opt.value }))}
                      >
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Reading */}
              <div className={`onboarding-step-section${state.step === 2 ? " is-active" : ""}`}>
                <h3>Translations & Layout</h3>
                <p className="section-intro">Configure side-by-side or stacked English translation pairs.</p>

                <div className="onboarding-option-group">
                  <span className="group-label">English Translation</span>
                  <div className="option-card-grid">
                    {translationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card${state.translationLayout === opt.value ? " is-selected" : ""}`}
                        onClick={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            translationLayout: opt.value as OnboardingState["translationLayout"]
                          }))
                        }
                      >
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="onboarding-option-group">
                  <span className="group-label">Text Focus</span>
                  <div className="option-card-grid">
                    {focusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card${state.textMode === opt.value ? " is-selected" : ""}`}
                        onClick={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            textMode: opt.value as OnboardingState["textMode"]
                          }))
                        }
                      >
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Listening */}
              <div className={`onboarding-step-section${state.step === 3 ? " is-active" : ""}`}>
                <h3>Narration & Catalog</h3>
                <p className="section-intro">Set your preferred initial audio playback rate and story level.</p>

                <div className="onboarding-option-group">
                  <span className="group-label">Playback Speed</span>
                  <div className="speed-chip-grid">
                    {[0.85, 0.95, 1, 1.05, 1.15].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        className={`speed-chip${state.playbackRate === rate ? " is-selected" : ""}`}
                        onClick={() => onUpdateState((prev) => ({ ...prev, playbackRate: rate }))}
                      >
                        {rate}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="onboarding-option-group">
                  <span className="group-label">Target Difficulty</span>
                  <div className="option-card-grid">
                    {[
                      { level: "all", label: "All levels", desc: "Show complete library" },
                      { level: "B1", label: "Intermediate (B1)", desc: "Familiar literary stories" },
                      { level: "B2", label: "Upper Intermediate (B2)", desc: "Rich literary vocabulary" },
                      { level: "C1", label: "Advanced (C1)", desc: "Classical literature & philosophy" }
                    ].map((item) => (
                      <button
                        key={item.level}
                        type="button"
                        className={`option-card${state.catalogLevel === item.level ? " is-selected" : ""}`}
                        onClick={() => onUpdateState((prev) => ({ ...prev, catalogLevel: item.level }))}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Interactive Reader Preview */}
            <div className="onboarding-preview-pane">
              <div
                id="onboardingDemoFrame"
                className="demo-reader-frame"
                data-demo-theme={resolvedTheme}
                data-demo-highlight={state.highlight}
                data-demo-text-mode={state.textMode}
                data-demo-font={state.font}
                data-demo-width={state.readerWidth}
                data-demo-translation={state.translationLayout}
              >
                <div className="demo-player-bar">
                  <button
                    id="demoPlayBtn"
                    className="demo-play-btn"
                    type="button"
                    onClick={onTogglePlayDemo}
                  >
                    <span className="demo-play-icon">
                      {isPlayingDemo ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="5" y="4" width="4.5" height="16" rx="1" />
                          <rect x="14.5" y="4" width="4.5" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                      )}
                    </span>
                    <span className="demo-play-label">
                      {isPlayingDemo ? "Pause Demo" : "Play Demo"}
                    </span>
                  </button>

                  <div className="demo-progress-track">
                    <div id="demoProgressFill" className="demo-progress-fill" style={{ width: `${pct}%` }} />
                  </div>

                  <span id="demoTimeDisplay" className="demo-time-display">
                    {timeText}
                  </span>
                  <span id="demoSpeedDisplay" className="demo-speed-display">
                    {state.playbackRate}×
                  </span>
                </div>

                <div className="demo-reader-scroll">
                  <div id="demoSpanishText" className="demo-spanish-text" lang="es">
                    {DEMO_EXCERPT_WORDS.map((item, idx) => {
                      const isCurrent = idx === activeWordIndex;
                      const isRead = activeWordIndex >= 0 && idx < activeWordIndex;
                      return (
                        <React.Fragment key={idx}>
                          <button
                            type="button"
                            className={`demo-word${isCurrent ? " is-current" : ""}${isRead ? " is-read" : ""}`}
                            data-demo-index={idx}
                            onClick={() => onWordClick(idx)}
                          >
                            {item.word}
                          </button>
                          {item.separator && <span>{item.separator}</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {state.translationLayout !== "off" && (
                    <p id="demoEnglishTranslation" className="demo-english-translation" lang="en">
                      {DEMO_ENGLISH_TEXT}
                    </p>
                  )}

                  {popoverWord && (
                    <div id="demoWordPopover" className="demo-word-popover">
                      <strong id="demoPopoverWord">{popoverWord.word}</strong>
                      <p
                        id="demoPopoverDef"
                        dangerouslySetInnerHTML={{
                          __html: `${popoverWord.def}<em>Tap word in reader for instant vocabulary help.</em>`
                        }}
                      />
                      <button
                        type="button"
                        className="demo-popover-close"
                        onClick={onHidePopover}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <footer className="onboarding-footer">
            <button
              id="onboardingSkipBtn"
              className="secondary-btn"
              type="button"
              onClick={() => onClose(false)}
            >
              Skip
            </button>

            <div className="footer-nav-buttons">
              <button
                id="onboardingPrevBtn"
                className="secondary-btn"
                type="button"
                disabled={state.step === 1}
                onClick={() => onGoToStep(state.step - 1)}
              >
                Previous
              </button>

              {state.step < 3 ? (
                <button
                  id="onboardingNextBtn"
                  className="primary-btn"
                  type="button"
                  onClick={() => onGoToStep(state.step + 1)}
                >
                  Continue
                </button>
              ) : (
                <button
                  id="onboardingFinishBtn"
                  className="primary-btn"
                  type="button"
                  onClick={onFinish}
                >
                  Start Reading
                </button>
              )}
            </div>
          </footer>
        </div>
      </dialog>
    </div>
  );
};
