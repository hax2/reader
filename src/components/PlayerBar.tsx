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
    drawWaveform(canvasRef.current, progressFraction);
  }, [progressFraction]);

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

  return (
    <section className="listen-panel" aria-labelledby="app-title">
      <div className="listen-panel-inner">
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
              max={isAudio ? duration || 0 : Math.max(0, wordCount - 1)}
              step={isAudio ? 0.01 : 1}
              value={isAudio ? currentTime : Math.min(position, Math.max(0, wordCount - 1))}
              onChange={handleSeekChange}
              disabled={transportDisabled}
              aria-label="Seek"
              aria-valuetext={
                !isAudio
                  ? wordCount
                    ? `Word ${Math.min(position + 1, wordCount)} of ${wordCount}`
                    : "No text loaded"
                  : undefined
              }
            />
          </div>
          <div className="time-readout" aria-label="Playback position">
            <span id="currentTime" className="time-readout-inline">
              {isAudio
                ? formattedCurrentTime
                : wordCount
                  ? `Word ${Math.min(position + 1, wordCount).toLocaleString()}`
                  : "Word 0"}
            </span>
            <span className="time-divider" aria-hidden="true">
              /
            </span>
            <span id="duration" className="time-readout-inline">
              {isAudio ? formattedDuration : wordCount.toLocaleString()}
            </span>
          </div>
        </div>

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

            <label id="ttsVoiceControl" className="tts-voice-control" hidden={isAudio}>
              <span className="visually-hidden">Browser voice</span>
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
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <select
                id="ttsVoiceSelect"
                aria-label="Browser voice"
                value={selectedVoiceURI}
                disabled={!speechSynthesisSupported}
                onChange={(e) => onSelectVoice(e.target.value)}
              >
                {!speechSynthesisSupported ? (
                  <option value="">Browser speech unavailable</option>
                ) : ttsVoices.length > 0 ? (
                  ttsVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} · {voice.lang}
                    </option>
                  ))
                ) : (
                  <option value="">Automatic Spanish voice · es-ES</option>
                )}
              </select>
            </label>
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
