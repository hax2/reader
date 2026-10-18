import { useState, useCallback, useRef } from "react";
import { findPassageAt } from "../utils/passages";
import type { Passage, WordToken } from "../types";

export function usePassages({
  passages,
  audioRef,
  onStatus
}: {
  passages: Passage[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onStatus?: (message: string) => void;
}) {
  const [passageIndex, setPassageIndexState] = useState<number>(-1);
  const [passageRevealed, setPassageRevealedState] = useState<boolean>(false);
  const [waitingAtBoundary, setWaitingAtBoundary] = useState<boolean>(false);
  const handlingPassageBoundaryRef = useRef<boolean>(false);

  const setPassageRevealed = useCallback((revealed: boolean) => {
    setPassageRevealedState(revealed);
  }, []);

  const setPassageIndex = useCallback(
    (index: number) => {
      if (!passages.length) return;
      const clamped = Math.max(0, Math.min(passages.length - 1, index));
      setPassageIndexState(clamped);
      setWaitingAtBoundary(false);
      setPassageRevealedState(false);
    },
    [passages.length]
  );

  const movePassage = useCallback(
    (delta: number, play: boolean = true) => {
      if (!passages.length) return;
      const next = passageIndex + delta;
      if (next < 0) {
        onStatus?.("You're on the first passage.");
        return;
      }
      if (next >= passages.length) {
        onStatus?.("That was the last passage.");
        return;
      }
      const audio = audioRef.current;
      if (play && audio && audio.src) {
        audio.currentTime = Math.max(0, Math.min(passages[next].startTime, (audio.duration || Infinity) - 0.01));
      }
      setPassageIndex(next);
      if (play && audio && audio.src) {
        audio.play().catch(() => onStatus?.("Playback could not be started."));
      }
    },
    [audioRef, onStatus, passageIndex, passages, setPassageIndex]
  );

  const playCurrentPassage = useCallback(() => {
    const passage = passages[passageIndex];
    const audio = audioRef.current;
    if (!passage || !audio || !audio.src) return;
    setWaitingAtBoundary(false);
    audio.currentTime = Math.max(0, Math.min(passage.startTime, (audio.duration || Infinity) - 0.01));
    audio.play().catch(() => onStatus?.("Playback could not be started."));
  }, [audioRef, onStatus, passageIndex, passages]);

  const seekToPassageStart = useCallback(() => {
    const passage = passages[passageIndex];
    const audio = audioRef.current;
    if (!passage || !audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    const end = Math.min(passage.endTime, audio.duration);
    if (waitingAtBoundary || audio.currentTime < passage.startTime - 0.05 || audio.currentTime >= end) {
      audio.currentTime = Math.max(0, Math.min(passage.startTime, audio.duration - 0.01));
    }
  }, [audioRef, passageIndex, passages, waitingAtBoundary]);

  const handlePassagePlayback = useCallback(
    (time: number) => {
      const passage = passages[passageIndex];
      const audio = audioRef.current;
      if (!passage || !audio) return;

      if (!audio.paused && !audio.seeking && !handlingPassageBoundaryRef.current) {
        const end = audio.duration ? Math.min(passage.endTime, audio.duration) : passage.endTime;
        if (time >= end) {
          handlingPassageBoundaryRef.current = true;
          try {
            audio.pause();
            setWaitingAtBoundary(true);
            onStatus?.(`Passage ${passageIndex + 1} complete.`);
          } finally {
            handlingPassageBoundaryRef.current = false;
          }
          return;
        }
      }

      const insideCurrent = time >= passage.startTime - 0.001 && time <= passage.endTime;
      if (!insideCurrent) {
        const activeIndex = findPassageAt(passages, time);
        if (activeIndex >= 0 && activeIndex !== passageIndex) {
          setPassageIndex(activeIndex);
        }
      }
    },
    [audioRef, onStatus, passageIndex, passages, setPassageIndex]
  );

  return {
    passageIndex,
    passageRevealed,
    waitingAtBoundary,
    setPassageIndex,
    setPassageRevealed,
    movePassage,
    playCurrentPassage,
    seekToPassageStart,
    handlePassagePlayback
  };
}
