import React, { useRef, useEffect, useState } from "react";
import { drawWaveform } from "../utils/waveform";
import { formatPlaybackRate } from "../utils/text";
import { SPEED_RATES, speechSynthesisSupported } from "../utils/constants";

export interface PlayerBarProps {
  media: "audio" | "text";
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  formattedCurrentTime: string;
  formattedDuration: string;
  ttsWordIndex: number;
  wordCount: number;
  ttsChunkCount: number;
  ttsVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  playbackRate: number;
  studyCardCount: number;
  disabled?: boolean;
  isLoopingSentence?: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onToggleLoopSentence?: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onSelectVoice: (voiceURI: string) => void;
  onOpenAnkiReview: () => void;
}

const PLAY_ICON = (
  <svg className="play-glyph" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const PAUSE_ICON = (
  <svg className="pause-glyph" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="5" y="4" width="4.5" height="16" rx="1" />
    <rect x="14.5" y="4" width="4.5" height="16" rx="1" />
  </svg>
);

function formatVoiceOptionLabel(voice: SpeechSynthesisVoice): string {
  const cleanName = voice.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s+Online\s*\(Natural\)\s*/i, " ")
    .replace(/\s*-\s*Spanish\s*\([^)]*\)/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const langTag = (voice.lang || "es").replace("_", "-");
  return `${cleanName || voice.name} · ${langTag}`;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  media,
  isPlaying,
  isPaused,
  currentTime,
  duration,
  formattedCurrentTime,
  formattedDuration,
  ttsWordIndex,
  wordCount,
  ttsChunkCount,
  ttsVoices,
  selectedVoiceURI,
  playbackRate,
  studyCardCount,
  disabled = false,
  isLoopingSentence = false,
  onTogglePlay,
  onSeek,
  onSkipBack,
  onSkipForward,
  onToggleLoopSentence,
  onSetPlaybackRate,
  onSelectVoice,
  onOpenAnkiReview
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const speedControlRef = useRef<HTMLDivElement | null>(null);
  const speedBtnRef = useRef<HTMLButtonElement | null>(null);
  const speedOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  const isAudio = media === "audio";
  const position = Math.max(0, Math.min(ttsWordIndex, wordCount));
  const progressFraction = isAudio
    ? duration > 0
      ? Math.max(0, Math.min(currentTime / duration, 1))
      : 0
    : wordCount > 0
      ? Math.max(0, Math.min(position / Math.max(1, wordCount - 1), 1))
      : 0;

  useEffect(() => {
    if (isAudio) {
      drawWaveform(canvasRef.current, progressFraction);
    }
  }, [isAudio, progressFraction]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuOpen && speedControlRef.current && !speedControlRef.current.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && speedMenuOpen) {
        setSpeedMenuOpen(false);
        speedBtnRef.current?.focus();
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [speedMenuOpen]);

  const handleSpeedMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = speedOptionRefs.current.findIndex((el) => el === document.activeElement);
    let nextIndex = currentIndex >= 0 ? currentIndex : Math.max(0, SPEED_RATES.indexOf(playbackRate));
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (nextIndex + 1) % SPEED_RATES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (nextIndex - 1 + SPEED_RATES.length) % SPEED_RATES.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = SPEED_RATES.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    speedOptionRefs.current[nextIndex]?.focus();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onSeek(val);
  };

  const playLabel = isPlaying
    ? isAudio
      ? "Pause"
      : "Pause browser voice"
    : isPaused
      ? isAudio
        ? "Play"
        : "Resume browser voice"
      : isAudio
        ? "Play"
        : "Play with browser voice";

  const skipBackLabel = isAudio ? "Skip back 10 seconds" : "Previous sentence";
  const skipBackTitle = isAudio ? "Skip back 10s" : "Previous sentence";
  const skipForwardLabel = isAudio ? "Skip forward 10 seconds" : "Next sentence";
  const skipForwardTitle = isAudio ? "Skip forward 10s" : "Next sentence";

  const transportDisabled = isAudio
    ? disabled || !duration
    : disabled || !speechSynthesisSupported || !wordCount;
  const skipDisabled = isAudio
    ? disabled || !duration
    : disabled || !speechSynthesisSupported || ttsChunkCount < 2;

  const progressPercent = Math.round(progressFraction * 100);

  return (
    <section className={`listen-panel${!isAudio ? " is-tts-player" : ""}`} aria-labelledby="app-title">
      <div className="listen-panel-inner">
        {isAudio ? (
          <div className="timeline-wrap">
            <div className="waveform-container">
              <canvas
                id="waveform"
                ref={canvasRef}
                width={900}
                height={24}
                aria-hidden="true"
              />
              <input
                id="seek"
                className="seek"
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={currentTime}
                onChange={handleSeekChange}
                disabled={transportDisabled}
                aria-label="Seek"
              />
            </div>
            <div className="time-readout" aria-label="Playback position">
              <span id="currentTime" className="time-readout-inline">
                {formattedCurrentTime}
              </span>
              <span className="time-divider" aria-hidden="true">
                /
              </span>
              <span id="duration" className="time-readout-inline">
                {formattedDuration}
              </span>
            </div>
          </div>
        ) : (
          <div className="tts-timeline-wrap">
            <div className="tts-scrubber-container">
              <div className="tts-scrubber-track" aria-hidden="true">
                <div
                  className="tts-scrubber-fill"
                  style={{ width: `${progressFraction * 100}%` }}
                />
              </div>
              <input
                id="seek"
                className="seek tts-seek"
                type="range"
                min={0}
                max={Math.max(0, wordCount - 1)}
                step={1}
                value={Math.min(position, Math.max(0, wordCount - 1))}
                onChange={handleSeekChange}
                disabled={transportDisabled}
                aria-label="Reading position"
                aria-valuetext={
                  wordCount
                    ? `Word ${Math.min(position + 1, wordCount)} of ${wordCount}`
                    : "No text loaded"
                }
              />
            </div>
            <div className="tts-readout-row" aria-label="Reading position">
              <span id="currentTime" className="tts-readout-words">
                {wordCount
                  ? `Word ${Math.min(position + 1, wordCount).toLocaleString()} of ${wordCount.toLocaleString()}`
                  : "Word 0"}
              </span>
              <span id="duration" className="tts-readout-percent">
                {progressPercent}%
              </span>
            </div>
          </div>
        )}

        <div className="player-strip">
          <div className="speed-control" ref={speedControlRef}>
            <button
              id="playbackRate"
              ref={speedBtnRef}
              className="speed-button"
              type="button"
              aria-label={`Playback speed: ${playbackRate} times`}
              aria-haspopup="menu"
              aria-expanded={speedMenuOpen}
              aria-controls="speedMenu"
              onClick={() => {
                const next = !speedMenuOpen;
                setSpeedMenuOpen(next);
                if (next) {
                  window.setTimeout(() => {
                    const activeIdx = Math.max(0, SPEED_RATES.indexOf(playbackRate));
                    speedOptionRefs.current[activeIdx]?.focus();
                  }, 0);
                }
              }}
            >
              <span className="speed-value">{formatPlaybackRate(playbackRate)}</span>
              <svg
                className="speed-chevron"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div
              id="speedMenu"
              className="speed-menu"
              role="menu"
              aria-label="Playback speed"
              hidden={!speedMenuOpen}
              onKeyDown={handleSpeedMenuKeyDown}
            >
              {SPEED_RATES.map((rate, idx) => {
                const isSelected = rate === playbackRate;
                return (
                  <button
                    key={rate}
                    ref={(el) => {
                      speedOptionRefs.current[idx] = el;
                    }}
                    type="button"
                    role="menuitemradio"
                    className={isSelected ? "is-selected" : undefined}
                    data-rate={rate}
                    aria-checked={isSelected ? "true" : "false"}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => {
                      onSetPlaybackRate(rate);
                      setSpeedMenuOpen(false);
                      speedBtnRef.current?.focus();
                    }}
                  >
                    {formatPlaybackRate(rate)}
                  </button>
                );
              })}
            </div>

            {!isAudio && (
              <label id="ttsVoiceControl" className="tts-voice-control">
                <span className="visually-hidden">Browser voice</span>
                <svg
                  className="tts-voice-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                <select
                  id="ttsVoiceSelect"
                  aria-label="Browser voice"
                  value={selectedVoiceURI}
                  disabled={!speechSynthesisSupported}
                  onChange={(e) => onSelectVoice(e.target.value)}
                >
                  {!speechSynthesisSupported ? (
                    <option value="">Voice unavailable</option>
                  ) : ttsVoices.length > 0 ? (
                    ttsVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {formatVoiceOptionLabel(voice)}
                      </option>
                    ))
                  ) : (
                    <option value="">Spanish · es-ES</option>
                  )}
                </select>
                <svg
                  className="tts-voice-chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </label>
            )}
          </div>

          <div className="player-transport">
            <button
              id="skipBack"
              className="skip-button"
              type="button"
              onClick={onSkipBack}
              disabled={skipDisabled}
              aria-label={skipBackLabel}
              title={skipBackTitle}
            >
              {isAudio ? (
                <>
                  <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 8H5V3" />
                    <path d="M5.8 8.1a12 12 0 1 1-1 14" />
                  </svg>
                  <span className="skip-value" aria-hidden="true">
                    10
                  </span>
                </>
              ) : (
                <svg
                  className="tts-skip-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="19 20 9 12 19 4 19 20" />
                  <line x1="5" y1="19" x2="5" y2="5" />
                </svg>
              )}
            </button>

            <button
              id="playPause"
              className="play-button"
              type="button"
              onClick={onTogglePlay}
              disabled={transportDisabled}
              aria-label={playLabel}
              title={playLabel}
            >
              <span id="playIcon">{isPlaying ? PAUSE_ICON : PLAY_ICON}</span>
            </button>

            <button
              id="skipForward"
              className="skip-button"
              type="button"
              onClick={onSkipForward}
              disabled={skipDisabled}
              aria-label={skipForwardLabel}
              title={skipForwardTitle}
            >
              {isAudio ? (
                <>
                  <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 8h5V3" />
                    <path d="M26.2 8.1a12 12 0 1 0 1 14" />
                  </svg>
                  <span className="skip-value" aria-hidden="true">
                    10
                  </span>
                </>
              ) : (
                <svg
                  className="tts-skip-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              )}
            </button>

            {isAudio && onToggleLoopSentence && (
              <button
                id="loopSentence"
                className={`loop-sentence-button${isLoopingSentence ? " is-active" : ""}`}
                type="button"
                onClick={onToggleLoopSentence}
                disabled={skipDisabled}
                aria-pressed={isLoopingSentence}
                aria-label={isLoopingSentence ? "Stop repeating current sentence (L)" : "Repeat current sentence (L)"}
                title={isLoopingSentence ? "Looping current sentence (Press L to stop)" : "Loop current sentence (L)"}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span className="loop-badge" aria-hidden="true">1</span>
              </button>
            )}
          </div>

          <div className="study-actions-compact">
            <span id="studyCount" className="muted hidden-mobile">
              {studyCardCount.toLocaleString()} looked-up {studyCardCount === 1 ? "word" : "words"}
            </span>
            <button
              id="downloadAnki"
              className="utility-button"
              type="button"
              aria-label="Review Anki cards"
              title="Review Anki cards"
              disabled={studyCardCount === 0}
              onClick={onOpenAnkiReview}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
