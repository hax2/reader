import React from "react";
import { defaultAppearanceSettings } from "../utils/storage";
import type { AppearanceSettings } from "../types";

export interface AppearanceModalProps {
  isOpen: boolean;
  settings: AppearanceSettings;
  onClose: () => void;
  onUpdateSettings: (updater: (prev: AppearanceSettings) => AppearanceSettings) => void;
  onOpenOnboarding: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onOpenOnboarding
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    const defaults = defaultAppearanceSettings();
    onUpdateSettings(() => defaults);
  };

  return (
    <div className="settings-menu-overlay" onClick={onClose}>
      <div
        id="settingsMenu"
        className="settings-menu is-open"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Reading appearance"
      >
        <div className="settings-header">
          <h2>Reading appearance</h2>
          <button
            type="button"
            className="utility-button close-settings-btn"
            onClick={onClose}
            aria-label="Close appearance settings"
          >
            ✕
          </button>
        </div>

        <div className="appearance-controls">
          <label className="appearance-control">
            <span>Color theme</span>
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
              <option value="system">Match device theme</option>
              <option value="paper">Warm paper</option>
              <option value="mist">Muted slate</option>
              <option value="night">True black</option>
            </select>
          </label>

          <label className="appearance-control">
            <span>Current word highlight</span>
            <select
              id="highlightSelect"
              value={settings.highlight}
              onChange={(e) =>
                onUpdateSettings((prev) => ({ ...prev, highlight: e.target.value }))
              }
            >
              <option value="none">No highlight box</option>
              <option value="sage">Sage tint</option>
              <option value="sky">Sky tint</option>
              <option value="rose">Rose tint</option>
              <option value="underline">Minimal underline</option>
            </select>
          </label>

          <label className="appearance-control">
            <span>Text focus</span>
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
              <option value="dim-upcoming">Dim upcoming text (narration focus)</option>
              <option value="all">Keep all text bright</option>
            </select>
          </label>

          <label className="appearance-control">
            <span>English translation</span>
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
              <option value="english-below">Stacked below Spanish</option>
              <option value="side-by-side">Side-by-side columns</option>
              <option value="off">Spanish only (off)</option>
            </select>
          </label>

          <label className="appearance-control">
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
              <option value="serif">Literary serif</option>
              <option value="sans">Clean sans</option>
              <option value="accessible">Accessible sans</option>
            </select>
          </label>

          <label className="appearance-control">
            <span>Reading column width</span>
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
              <option value="narrow">Narrow (comfortable margins)</option>
              <option value="standard">Standard</option>
              <option value="wide">Wide</option>
            </select>
          </label>

          <label className="appearance-control">
            <span>Vocabulary preview</span>
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
              <option value="collapsed">Collapsed (review when ready)</option>
              <option value="expanded">Expanded (always open)</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>

          <label className="appearance-control slider-control">
            <div className="slider-label-row">
              <span>Text size</span>
              <output id="textSizeValue">{settings.textSize}%</output>
            </div>
            <input
              id="textSize"
              type="range"
              min={80}
              max={140}
              step={5}
              value={settings.textSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateSettings((prev) => ({ ...prev, textSize: val }));
              }}
            />
          </label>

          <label className="appearance-control slider-control">
            <div className="slider-label-row">
              <span>Line spacing</span>
              <output id="lineHeightValue">{settings.lineHeight.toFixed(1)}</output>
            </div>
            <input
              id="lineHeight"
              type="range"
              min={1.4}
              max={2.2}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateSettings((prev) => ({ ...prev, lineHeight: val }));
              }}
            />
          </label>
        </div>

        <div className="settings-footer">
          <button id="resetAppearance" type="button" onClick={handleReset}>
            Reset to defaults
          </button>
          <button
            id="openOnboardingFromSettings"
            type="button"
            className="secondary-btn"
            onClick={() => {
              onClose();
              onOpenOnboarding();
            }}
          >
            Preferences tutorial
          </button>
        </div>
      </div>
    </div>
  );
};
