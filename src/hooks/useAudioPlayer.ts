import { useRef, useState, useEffect, useCallback } from "react";
import { formatTime, formatPlaybackRate } from "../utils/text";
import { updateMediaSession, setMediaSessionPlaybackState } from "../utils/mediaSession";
import type { Track } from "../types";

export interface AudioPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isPaused: boolean;
  ended: boolean;
  playbackRate: number;
  formattedCurrentTime: string;
  formattedDuration: string;
}

export function useAudioPlayer({
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause
}: {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
} = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const pendingResumeTimeRef = useRef<number>(0);
  const resumeRetryTimerRef = useRef<number>(0);
  const resumeListenerCleanupRef = useRef<(() => void) | null>(null);

  const cancelResumeRetry = useCallback(() => {
    if (resumeRetryTimerRef.current) {
      window.clearTimeout(resumeRetryTimerRef.current);
      resumeRetryTimerRef.current = 0;
    }
    resumeListenerCleanupRef.current?.();
    resumeListenerCleanupRef.current = null;
  }, []);

  const applyResumePosition = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || pendingResumeTimeRef.current <= 0 || !audio.duration || !Number.isFinite(audio.duration)) {
      return;
    }
    if (resumeRetryTimerRef.current) return;
    const target = Math.min(pendingResumeTimeRef.current, Math.max(0, audio.duration - 1));
    const confirmSeek = () => {
      if (Math.abs(audio.currentTime - target) < 0.75) {
        pendingResumeTimeRef.current = 0;
        cancelResumeRetry();
      }
    };
    resumeListenerCleanupRef.current = () => {
      audio.removeEventListener("seeked", confirmSeek);
      audio.removeEventListener("timeupdate", confirmSeek);
      audio.removeEventListener("canplay", confirmSeek);
    };
    audio.addEventListener("seeked", confirmSeek);
    audio.addEventListener("timeupdate", confirmSeek);
    audio.addEventListener("canplay", confirmSeek);
    audio.currentTime = target;

    resumeRetryTimerRef.current = window.setTimeout(() => {
      resumeRetryTimerRef.current = 0;
      resumeListenerCleanupRef.current?.();
      resumeListenerCleanupRef.current = null;
      if (pendingResumeTimeRef.current > 0 && audio.duration && Number.isFinite(audio.duration)) {
        const retryTarget = Math.min(pendingResumeTimeRef.current, Math.max(0, audio.duration - 1));
        pendingResumeTimeRef.current = 0;
        audio.currentTime = retryTarget;
      }
    }, 250);
  }, [cancelResumeRetry]);

  const setAudioSource = useCallback(
    (src: string, resumeTime: number = 0) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      cancelResumeRetry();
      pendingResumeTimeRef.current = resumeTime;
      audio.src = src;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    },
    [cancelResumeRetry]
  );

  const clearAudioSource = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    cancelResumeRetry();
    audio.removeAttribute("src");
    audio.load();
    pendingResumeTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [cancelResumeRetry]);

  const setPlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
    setPlaybackRateState(rate);
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    try {
      await audio.play();
      setIsPlaying(true);
      setMediaSessionPlaybackState("playing");
      onPlay?.();
    } catch {
      setIsPlaying(false);
      setMediaSessionPlaybackState("paused");
    }
  }, [onPlay]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    setMediaSessionPlaybackState("paused");
    onPause?.();
  }, [onPause]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((targetTime: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(targetTime)) return;
    const clamped = Math.max(0, Math.min(targetTime, audio.duration || targetTime));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      const audio = audioRef.current;
      if (!audio || !audio.duration) return;
      const nextTime = Math.max(0, Math.min(audio.currentTime + deltaSeconds, audio.duration));
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    []
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (pendingResumeTimeRef.current > 0) {
        applyResumePosition();
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime, audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setMediaSessionPlaybackState("playing");
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      setMediaSessionPlaybackState("paused");
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setMediaSessionPlaybackState("paused");
      onEnded?.();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [applyResumePosition, onEnded, onPause, onPlay, onTimeUpdate]);

  return {
    audioRef,
    isPlaying,
    isPaused: !isPlaying && currentTime > 0,
    currentTime,
    duration,
    playbackRate,
    formattedCurrentTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    play,
    pause,
    togglePlay,
    seek,
    skipBy,
    setAudioSource,
    clearAudioSource,
    setPlaybackRate,
    applyResumePosition,
    cancelResumeRetry
  };
}
