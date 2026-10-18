import React, { useEffect, useRef } from "react";
import type { OnboardingState } from "../hooks/useOnboardingDemo";

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

const FONT_FAMILIES: Record<OnboardingState["font"], string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  accessible: "Atkinson Hyperlegible, -apple-system, BlinkMacSystemFont, sans-serif"
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  state,
  onClose,
  onGoToStep,
  onFinish,
  onUpdateState
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const controlsPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    } else if (!isOpen && dialog.open) {
      try {
        dialog.close();
      } catch {
        dialog.removeAttribute("open");
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (controlsPaneRef.current) {
      controlsPaneRef.current.scrollTop = 0;
    }
  }, [state.step]);

  return (
    <dialog
      ref={dialogRef}
      id="onboardingDialog"
      className="onboarding-dialog"
      aria-labelledby="onboardingDialogTitle"
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose(false);
        }
      }}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <nav className="onboarding-steps-nav" aria-label="Preference sections">
          <button
            type="button"
            className={`step-pill${state.step === 1 ? " is-active" : state.step > 1 ? " is-completed" : ""}`}
            data-step="1"
            onClick={() => onGoToStep(1)}
          >
            <span className="step-num">1</span>
            <span className="step-label">Appearance</span>
          </button>
          <button
            type="button"
            className={`step-pill${state.step === 2 ? " is-active" : state.step > 2 ? " is-completed" : ""}`}
            data-step="2"
            onClick={() => onGoToStep(2)}
          >
            <span className="step-num">2</span>
            <span className="step-label">Text</span>
          </button>
          <button
            type="button"
            className={`step-pill${state.step === 3 ? " is-active" : ""}`}
            data-step="3"
            onClick={() => onGoToStep(3)}
          >
            <span className="step-num">3</span>
            <span className="step-label">Playback</span>
          </button>
        </nav>

        <div id="onboardingBody" className="onboarding-body">
          <div ref={controlsPaneRef} className="onboarding-controls-pane">
            {/* STEP 1: Theme & Ambiance */}
            <section className={`onboarding-step-section${state.step === 1 ? " is-active" : ""}`} data-step-panel="1">
              <div className="step-header">
                <h3>Choose a Theme &amp; Tone</h3>
                <p className="step-desc">Pick an atmosphere tailored for comfortable day, evening, or night reading sessions.</p>
              </div>

              <div className="option-grid theme-options" role="radiogroup" aria-label="Color theme">
                {[
                  {
                    value: "paper" as const,
                    swatchClass: "paper-swatch",
                    title: "Paper",
                    desc: "Warm cream editorial tone, dark olive-charcoal ink. Classic book feel."
                  },
                  {
                    value: "mist" as const,
                    swatchClass: "mist-swatch",
                    title: "Mist",
                    desc: "Cool slate & mint tint with serene contrast. Calm on the eyes."
                  },
                  {
                    value: "night" as const,
                    swatchClass: "night-swatch",
                    title: "Night",
                    desc: "Deep obsidian OLED dark mode with crisp, gentle white text."
                  },
                  {
                    value: "system" as const,
                    swatchClass: "system-swatch",
                    title: "System",
                    desc: "Automatically matches your operating system light or dark mode."
                  }
                ].map((opt) => {
                  const selected = state.theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`option-card${selected ? " is-selected" : ""}`}
                      data-setting="theme"
                      data-value={opt.value}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onUpdateState((prev) => ({ ...prev, theme: opt.value }))}
                    >
                      <div className={`theme-swatch ${opt.swatchClass}`}>
                        {opt.value === "system" ? (
                          <>
                            <span className="swatch-split left">A</span>
                            <span className="swatch-split right">a</span>
                          </>
                        ) : (
                          <span className="swatch-text">Aa</span>
                        )}
                      </div>
                      <div className="option-info">
                        <strong className="option-title">{opt.title}</strong>
                        <span className="option-desc">{opt.desc}</span>
                      </div>
                      <span className="check-badge" aria-hidden="true">✓</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP 2: Typography */}
            <section className={`onboarding-step-section${state.step === 2 ? " is-active" : ""}`} data-step-panel="2">
              <div className="step-header">
                <h3>Choose your reading text</h3>
                <p className="step-desc">Each option is shown exactly as it will look while you read.</p>
              </div>

              <div className="control-group">
                <label className="group-label">Typeface</label>
                <div className="option-grid font-options" role="radiogroup" aria-label="Typeface">
                  {[
                    { value: "serif" as const, className: "font-serif", title: "Book Serif" },
                    { value: "sans" as const, className: "font-sans", title: "Clean Sans" },
                    { value: "accessible" as const, className: "font-accessible", title: "Accessible Sans" }
                  ].map((opt) => {
                    const selected = state.font === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card type-choice ${opt.className}${selected ? " is-selected" : ""}`}
                        data-setting="font"
                        data-value={opt.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onUpdateState((prev) => ({ ...prev, font: opt.value }))}
                      >
                        <strong className="option-title">{opt.title}</strong>
                        <span className="type-sample">Platero es pequeño, peludo, suave.</span>
                        <span className="choice-indicator" aria-hidden="true">✓</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="control-group">
                <label className="group-label">Text size</label>
                <div className="option-grid text-size-options" role="radiogroup" aria-label="Text size">
                  {[
                    { value: 85, label: "Small", sampleClass: "size-sample-small" },
                    { value: 100, label: "Regular", sampleClass: "size-sample-regular" },
                    { value: 120, label: "Large", sampleClass: "size-sample-large" },
                    { value: 135, label: "Extra large", sampleClass: "size-sample-extra" }
                  ].map((opt) => {
                    const selected = state.textSize === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card size-choice${selected ? " is-selected" : ""}`}
                        data-setting="textSize"
                        data-value={opt.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onUpdateState((prev) => ({ ...prev, textSize: opt.value }))}
                      >
                        <span className="size-choice-label">{opt.label}</span>
                        <span className={`size-sample ${opt.sampleClass}`}>Platero es suave.</span>
                        <span className="choice-indicator" aria-hidden="true">✓</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* STEP 3: Audio & Reading Tracking */}
            <section className={`onboarding-step-section${state.step === 3 ? " is-active" : ""}`} data-step-panel="3">
              <div className="step-header">
                <h3>Audio Sync &amp; Highlighting</h3>
                <p className="step-desc">Customize how words illuminate and translations display as you listen.</p>
              </div>

              <div className="mobile-demo-sample-bar" role="region" aria-label="Highlight style preview">
                <span className="mobile-sample-tag">Highlight preview</span>
                <div
                  id="mobileSampleCard"
                  className="mobile-sample-card"
                  style={{
                    fontFamily: FONT_FAMILIES[state.font] || FONT_FAMILIES.serif,
                    lineHeight: state.lineHeight,
                    fontSize: `${(1.05 * state.textSize) / 100}rem`
                  }}
                >
                  <p id="mobileSampleText" className="mobile-sample-text">
                    Platero es suave; sólo los espejos de <mark id="mobileSampleMark" className="mobile-sample-mark">azabache</mark> de sus ojos son duros.
                  </p>
                </div>
              </div>

              <div className="control-group">
                <label className="group-label">Word Highlight Style</label>
                <div className="highlight-pills" role="radiogroup" aria-label="Highlight style">
                  {[
                    { value: "sage" as const, dotClass: "dot-sage", label: "Sage wash" },
                    { value: "sky" as const, dotClass: "dot-sky", label: "Sky wash" },
                    { value: "rose" as const, dotClass: "dot-rose", label: "Rose wash" },
                    { value: "underline" as const, dotClass: "dot-underline", label: "Underline" },
                    { value: "none" as const, dotClass: "dot-none", label: "None" }
                  ].map((opt) => {
                    const selected = state.highlight === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`highlight-chip${selected ? " is-selected" : ""}`}
                        data-setting="highlight"
                        data-value={opt.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onUpdateState((prev) => ({ ...prev, highlight: opt.value }))}
                      >
                        <span className={`chip-dot ${opt.dotClass}`} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="control-group">
                <label className="group-label">Keep your place while listening</label>
                <div className="option-grid focus-options" role="radiogroup" aria-label="Focus mode">
                  <button
                    type="button"
                    className={`option-card${state.textMode === "dim-passed" ? " is-selected" : ""}`}
                    data-setting="textMode"
                    data-value="dim-passed"
                    role="radio"
                    aria-checked={state.textMode === "dim-passed"}
                    onClick={() => onUpdateState((prev) => ({ ...prev, textMode: "dim-passed" }))}
                  >
                    <div className="option-info">
                      <strong className="option-title">Fade words already heard</strong>
                      <span className="focus-demo-labels" aria-hidden="true">
                        <span>Heard</span>
                        <span>Now</span>
                        <span>Next</span>
                      </span>
                      <span className="focus-demo-line" aria-hidden="true">
                        <span className="demo-dimmed">era</span>
                        <mark>pequeño</mark>
                        <span>y suave</span>
                      </span>
                    </div>
                    <span className="choice-indicator" aria-hidden="true">✓</span>
                  </button>
                  <button
                    type="button"
                    className={`option-card${state.textMode === "dim-upcoming" ? " is-selected" : ""}`}
                    data-setting="textMode"
                    data-value="dim-upcoming"
                    role="radio"
                    aria-checked={state.textMode === "dim-upcoming"}
                    onClick={() => onUpdateState((prev) => ({ ...prev, textMode: "dim-upcoming" }))}
                  >
                    <div className="option-info">
                      <strong className="option-title">Fade words coming next</strong>
                      <span className="focus-demo-labels" aria-hidden="true">
                        <span>Heard</span>
                        <span>Now</span>
                        <span>Next</span>
                      </span>
                      <span className="focus-demo-line" aria-hidden="true">
                        <span>era</span>
                        <mark>pequeño</mark>
                        <span className="demo-dimmed">y suave</span>
                      </span>
                    </div>
                    <span className="choice-indicator" aria-hidden="true">✓</span>
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label className="group-label">Translation Display</label>
                <div className="option-grid translation-options" role="radiogroup" aria-label="Translation layout">
                  {[
                    {
                      value: "spanish-only" as const,
                      title: "Spanish only (Immersion)",
                      desc: "Pure Spanish text; tap any word for instant English definitions and vocabulary review."
                    },
                    {
                      value: "side-by-side" as const,
                      title: "Side by side (Parallel)",
                      desc: "Dual columns with aligned English translations running parallel to the Spanish text."
                    },
                    {
                      value: "english-below" as const,
                      title: "English underneath",
                      desc: "Interlinear translation directly beneath each Spanish sentence block."
                    }
                  ].map((opt) => {
                    const selected = state.translationLayout === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card${selected ? " is-selected" : ""}`}
                        data-setting="translationLayout"
                        data-value={opt.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onUpdateState((prev) => ({ ...prev, translationLayout: opt.value }))}
                      >
                        <div className="option-info">
                          <strong className="option-title">{opt.title}</strong>
                          <span className="option-desc">{opt.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="control-group">
                <label className="group-label">Default Playback Speed</label>
                <div className="speed-chips" role="radiogroup" aria-label="Audio playback speed">
                  {[
                    { value: 0.75, label: "0.75×" },
                    { value: 0.9, label: "0.90×" },
                    { value: 1, label: "1.0×" },
                    { value: 1.1, label: "1.10×" },
                    { value: 1.25, label: "1.25×" },
                    { value: 1.5, label: "1.50×" }
                  ].map((opt) => {
                    const selected = state.playbackRate === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`speed-chip${selected ? " is-selected" : ""}`}
                        data-setting="playbackRate"
                        data-value={opt.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onUpdateState((prev) => ({ ...prev, playbackRate: opt.value }))}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="control-group">
                <label className="group-label">Pre-reading Vocabulary Warmup</label>
                <div className="option-grid vocab-preview-options" role="radiogroup" aria-label="Pre-reading vocabulary warmup">
                  {[
                    {
                      value: "always" as const,
                      title: "Expanded preview",
                      desc: "Open the vocabulary list automatically when a reading loads."
                    },
                    {
                      value: "collapsed" as const,
                      title: "Compact preview (Recommended)",
                      desc: "See how many useful words were picked, then open the list only when you want it."
                    },
                    {
                      value: "off" as const,
                      title: "Off",
                      desc: "Go directly to the text without a vocabulary preview."
                    }
                  ].map((opt) => {
                    const selected = state.vocabWarmup === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-card${selected ? " is-selected" : ""}`}
                        data-setting="vocabWarmup"
                        data-value={opt.value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onUpdateState((prev) => ({ ...prev, vocabWarmup: opt.value }))}
                      >
                        <div className="option-info">
                          <strong className="option-title">{opt.title}</strong>
                          <span className="option-desc">{opt.desc}</span>
                        </div>
                        <span className="check-badge" aria-hidden="true">✓</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Preference navigation footer */}
        <footer className="onboarding-footer">
          <button
            id="onboardingSkipBtn"
            className="text-button onboarding-skip-btn"
            type="button"
            onClick={() => onClose(false)}
          >
            Cancel
          </button>

          <div className="onboarding-nav-actions">
            <button
              id="onboardingPrevBtn"
              className="secondary-button"
              type="button"
              disabled={state.step === 1}
              onClick={() => onGoToStep(state.step - 1)}
            >
              Back
            </button>
            <button
              id="onboardingNextBtn"
              className="primary-button"
              type="button"
              hidden={state.step === 3}
              onClick={() => onGoToStep(state.step + 1)}
            >
              Continue
            </button>
            <button
              id="onboardingFinishBtn"
              className="primary-button finish-btn"
              type="button"
              hidden={state.step !== 3}
              onClick={onFinish}
            >
              Save preferences
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
};
