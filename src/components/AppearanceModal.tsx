import React, { useRef, useState, useEffect, useCallback } from "react";
import { defaultAppearanceSettings } from "../utils/storage";
import type { AppearanceSettings } from "../types";

export interface AppearanceModalProps {
  settings: AppearanceSettings;
  onUpdateSettings: (updater: (prev: AppearanceSettings) => AppearanceSettings) => void;
  onOpenOnboarding: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  settings,
  onUpdateSettings,
  onOpenOnboarding
}) => {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [activeSlider, setActiveSlider] = useState<"textSize" | "lineHeight" | null>(null);
  const draggingRef = useRef(false);
  const previewTimerRef = useRef<number>(0);

  const endSliderPreview = useCallback(() => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = 0;
    }
    setActiveSlider(null);
  }, []);

  const beginSliderPreview = useCallback((slider: "textSize" | "lineHeight") => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = 0;
    }
    setActiveSlider(slider);
  }, []);

  const scheduleSliderPreviewEnd = useCallback(() => {
    if (draggingRef.current) return;
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(endSliderPreview, 700);
  }, [endSliderPreview]);

  useEffect(() => {
    const handlePointerUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        endSliderPreview();
      }
    };
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (detailsRef.current?.open && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.removeAttribute("open");
        endSliderPreview();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.removeAttribute("open");
        endSliderPreview();
      }
    };
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    document.addEventListener("pointerdown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.removeEventListener("pointerdown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    };
  }, [endSliderPreview]);

  const handleReset = () => {
    const defaults = defaultAppearanceSettings();
    onUpdateSettings((prev) => ({
      ...defaults,
      playbackRate: prev.playbackRate,
      ttsVoiceURI: prev.ttsVoiceURI
    }));
  };

  return (
    <details
      id="settingsMenu"
      ref={detailsRef}
      className="settings-menu"
      onToggle={() => {
        if (!detailsRef.current?.open) endSliderPreview();
      }}
    >
      <summary className="utility-button" aria-label="Settings">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </summary>
      <div className={`appearance-controls${activeSlider ? " is-adjusting" : ""}`}>
        <div className="appearance-heading">
          <div>
            <strong>Reading appearance</strong>
            <span>Make the page comfortable for you.</span>
          </div>
          <div className="appearance-actions">
            <button
              id="openOnboardingFromSettings"
              className="text-button"
              type="button"
              onClick={() => {
                detailsRef.current?.removeAttribute("open");
                endSliderPreview();
                onOpenOnboarding();
              }}
            >
              More options
            </button>
            <button
              id="resetAppearance"
              className="text-button"
              type="button"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        <label>
          <span>Theme</span>
          <select
            id="themeSelect"
            value={settings.theme}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                theme: e.target.value as AppearanceSettings["theme"]
              }))
            }
          >
            <option value="system">System</option>
            <option value="paper">Paper</option>
            <option value="mist">Mist</option>
            <option value="night">Night</option>
          </select>
        </label>

        <label>
          <span>Text mode</span>
          <select
            id="textModeSelect"
            value={settings.textMode}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                textMode: e.target.value as AppearanceSettings["textMode"]
              }))
            }
          >
            <option value="dim-passed">Dim passed</option>
            <option value="dim-upcoming">Dim upcoming</option>
          </select>
        </label>

        <label>
          <span>Translation</span>
          <select
            id="translationLayoutSelect"
            value={settings.translationLayout}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                translationLayout: e.target.value as AppearanceSettings["translationLayout"]
              }))
            }
          >
            <option value="spanish-only">Spanish only</option>
            <option value="side-by-side">Side by side</option>
            <option value="english-below">English underneath</option>
          </select>
        </label>

        <label>
          <span>Highlight</span>
          <select
            id="highlightSelect"
            value={settings.highlight}
            onChange={(e) =>
              onUpdateSettings((prev) => ({ ...prev, highlight: e.target.value }))
            }
          >
            <option value="sage">Sage wash</option>
            <option value="sky">Sky wash</option>
            <option value="rose">Rose wash</option>
            <option value="underline">Underline</option>
            <option value="none">None</option>
          </select>
        </label>

        <label className={activeSlider === "textSize" ? "is-active-control" : undefined}>
          <span className="control-label">
            <span>Text size</span>
            <output id="textSizeValue" htmlFor="textSize">
              {settings.textSize}%
            </output>
          </span>
          <input
            id="textSize"
            type="range"
            min={80}
            max={140}
            step={5}
            value={settings.textSize}
            onPointerDown={() => {
              draggingRef.current = true;
              beginSliderPreview("textSize");
            }}
            onChange={(e) => {
              beginSliderPreview("textSize");
              const val = Number(e.target.value);
              onUpdateSettings((prev) => ({ ...prev, textSize: val }));
              scheduleSliderPreviewEnd();
            }}
          />
        </label>

        <label className={activeSlider === "lineHeight" ? "is-active-control" : undefined}>
          <span className="control-label">
            <span>Line spacing</span>
            <output id="lineHeightValue" htmlFor="lineHeight">
              {settings.lineHeight.toFixed(1)}
            </output>
          </span>
          <input
            id="lineHeight"
            type="range"
            min={1.4}
            max={2.2}
            step={0.1}
            value={settings.lineHeight}
            onPointerDown={() => {
              draggingRef.current = true;
              beginSliderPreview("lineHeight");
            }}
            onChange={(e) => {
              beginSliderPreview("lineHeight");
              const val = Number(e.target.value);
              onUpdateSettings((prev) => ({ ...prev, lineHeight: val }));
              scheduleSliderPreviewEnd();
            }}
          />
        </label>

        <label>
          <span>Typeface</span>
          <select
            id="fontSelect"
            value={settings.font}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                font: e.target.value as AppearanceSettings["font"]
              }))
            }
          >
            <option value="serif">Book serif</option>
            <option value="sans">Clean sans</option>
            <option value="accessible">Accessible sans</option>
          </select>
        </label>

        <label>
          <span>Text width</span>
          <select
            id="readerWidthSelect"
            value={settings.readerWidth}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                readerWidth: e.target.value as AppearanceSettings["readerWidth"]
              }))
            }
          >
            <option value="narrow">Narrow</option>
            <option value="standard">Standard</option>
            <option value="wide">Wide</option>
          </select>
        </label>

        <label>
          <span>Vocab warmup</span>
          <select
            id="vocabWarmupSelect"
            value={settings.vocabWarmup}
            onChange={(e) =>
              onUpdateSettings((prev) => ({
                ...prev,
                vocabWarmup: e.target.value as AppearanceSettings["vocabWarmup"]
              }))
            }
          >
            <option value="always">Expanded preview</option>
            <option value="collapsed">Compact preview</option>
            <option value="off">Off</option>
          </select>
        </label>
      </div>
    </details>
  );
};
