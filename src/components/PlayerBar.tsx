import React, { useRef, useEffect, useState } from "react";
import { drawWaveform } from "../utils/waveform";
import { formatPlaybackRate } from "../utils/text";
import { SPEED_RATES } from "../utils/constants";
import type { AppearanceSettings } from "../types";

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
  ttsVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  playbackRate: number;
  disabled?: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onSelectVoice: (voiceURI: string) => void;
}

export function updateSpeedButton(rate: number): string {
  return formatPlaybackRate(rate);
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
  ttsVoices,
  selectedVoiceURI,
  playbackRate,
  disabled = false,
  onTogglePlay,
  onSeek,
  onSkipBack,
  onSkipForward,
  onSetPlaybackRate,
  onSelectVoice
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  const isAudio = media === "audio";
  const progressFraction = isAudio
    ? duration > 0
      ? Math.max(0, Math.min(currentTime / duration, 1))
      : 0
    : wordCount > 0
      ? Math.max(0, Math.min(ttsWordIndex / wordCount, 1))
      : 0;

  useEffect(() => {
    drawWaveform(canvasRef.current, progressFraction);
  }, [progressFraction]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    if (isAudio && duration > 0) {
      onSeek(ratio * duration);
    } else if (!isAudio && wordCount > 0) {
      onSeek(Math.floor(ratio * wordCount));
    }
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
        ? "Resume"
        : "Resume browser voice"
      : isAudio
        ? "Play"
        : "Play with browser voice";

  const skipBackLabel = isAudio ? "Skip back 10s" : "Previous sentence";
  const skipForwardLabel = isAudio ? "Skip forward 10s" : "Next sentence";

  return (
    <section className="listen-panel" aria-label="Audio player">
      <div className="waveform-wrapper">
        <canvas
          id="waveform"
          ref={canvasRef}
          width={800}
          height={64}
          onClick={handleCanvasClick}
          aria-hidden="true"
        />
      </div>

      <div className="player-bar">
        <button
          id="playPause"
          className="play-button"
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          aria-label={playLabel}
          title={playLabel}
        >
          <span id="playIcon">{isPlaying ? PAUSE_ICON : PLAY_ICON}</span>
        </button>

        <button
          id="skipBack"
          className="skip-button"
          type="button"
          onClick={onSkipBack}
          disabled={disabled}
          aria-label={skipBackLabel}
          title={skipBackLabel}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            <text x="12" y="15" fontSize="8" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="bold">
              10
            </text>
          </svg>
        </button>

        <button
          id="skipForward"
          className="skip-button"
          type="button"
          onClick={onSkipForward}
          disabled={disabled}
          aria-label={skipForwardLabel}
          title={skipForwardLabel}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            <text x="12" y="15" fontSize="8" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="bold">
              10
            </text>
          </svg>
        </button>

        <div className="time-display" aria-live="off">
          <span id="currentTime">
            {isAudio ? formattedCurrentTime : `${ttsWordIndex.toLocaleString()}w`}
          </span>
          <span className="time-separator">/</span>
          <span id="duration">
            {isAudio ? formattedDuration : `${wordCount.toLocaleString()}w`}
          </span>
        </div>

        <div className="seek-wrapper">
          <input
            id="seek"
            type="range"
            min={0}
            max={isAudio ? duration || 100 : Math.max(1, wordCount - 1)}
            step={isAudio ? 0.01 : 1}
            value={isAudio ? currentTime : ttsWordIndex}
            onChange={handleSeekChange}
            disabled={disabled}
            aria-label="Seek track"
          />
        </div>

        <div className="speed-control-wrapper">
          <button
            id="playbackRate"
            className="playback-rate-btn"
            type="button"
            aria-expanded={speedMenuOpen}
            aria-haspopup="true"
            aria-label={`Playback speed: ${playbackRate} times`}
            onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
          >
            <span className="speed-value">{formatPlaybackRate(playbackRate)}</span>
          </button>

          {speedMenuOpen && (
            <div id="speedMenu" className="speed-menu" role="menu">
              {SPEED_RATES.map((rate) => {
                const isSelected = rate === playbackRate;
                return (
                  <button
                    key={rate}
                    type="button"
                    role="menuitemradio"
                    className={`speed-option${isSelected ? " is-selected" : ""}`}
                    data-rate={rate}
                    aria-checked={isSelected ? "true" : "false"}
                    onClick={() => {
                      onSetPlaybackRate(rate);
                      setSpeedMenuOpen(false);
                    }}
                  >
                    {formatPlaybackRate(rate)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!isAudio && (
          <div id="ttsVoiceControl" className="tts-voice-control">
            <select
              id="ttsVoiceSelect"
              value={selectedVoiceURI}
              onChange={(e) => onSelectVoice(e.target.value)}
              aria-label="Browser text-to-speech voice"
            >
              {ttsVoices.length > 0 ? (
                ttsVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} · {voice.lang}
                  </option>
                ))
              ) : (
                <option value="">Automatic Spanish voice · es-ES</option>
              )}
            </select>
          </div>
        )}
      </div>
    </section>
  );
};
