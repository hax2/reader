import type { Track } from "../types";

export function coverMimeType(src: string): string {
  const extension = String(src).split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif"
  };
  return (extension && map[extension]) || "";
}

export function updateMediaSession(track: Track | null): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") {
    return;
  }
  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }
  let artwork: MediaImage[] = [];
  if (track.cover && typeof document !== "undefined") {
    const type = coverMimeType(track.cover);
    artwork = [
      {
        src: new URL(track.cover, document.baseURI).href,
        sizes: "848x1264",
        ...(type ? { type } : {})
      }
    ];
  }
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || "",
    artist: track.author || "",
    album: "Spanish Listening Reader",
    artwork
  });
}

export function setMediaSessionPlaybackState(state: "none" | "paused" | "playing"): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch {
    // playbackState assignment is optional.
  }
}
