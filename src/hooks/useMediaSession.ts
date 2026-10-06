"use client";

import { useEffect, useRef, useCallback } from "react";

export interface MediaSessionMetadataOptions {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  duration?: number;
  currentTime?: number;
  isPlaying: boolean;
  playbackRate?: number;
  onPlay: () => void;
  onPause: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (newTime: number) => void;
}

// 1-second silent WAV data URI for holding OS audio focus in background tabs/lockscreen on mobile
const SILENT_AUDIO_URI = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A";

export function useMediaSession(options: MediaSessionMetadataOptions) {
  const {
    title,
    artist,
    album = "TeraPlay Music",
    artworkUrl,
    duration = 0,
    currentTime = 0,
    isPlaying,
    playbackRate = 1,
    onPlay,
    onPause,
    onNextTrack,
    onPrevTrack,
    onSeek,
  } = options;

  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);

  // References to keep event handlers fresh without re-registering action handlers on every render
  const handlersRef = useRef({
    onPlay,
    onPause,
    onNextTrack,
    onPrevTrack,
    onSeek,
    currentTime,
    duration,
  });

  useEffect(() => {
    handlersRef.current = {
      onPlay,
      onPause,
      onNextTrack,
      onPrevTrack,
      onSeek,
      currentTime,
      duration,
    };
  }, [onPlay, onPause, onNextTrack, onPrevTrack, onSeek, currentTime, duration]);

  // Initialize and update Media Session metadata
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      const defaultIcon = "/icon.svg";
      const art = artworkUrl || defaultIcon;

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: title || "TeraPlay Track",
        artist: artist || "TeraPlay",
        album: album || "TeraPlay",
        artwork: [
          { src: art, sizes: "96x96", type: "image/png" },
          { src: art, sizes: "128x128", type: "image/png" },
          { src: art, sizes: "192x192", type: "image/png" },
          { src: art, sizes: "256x256", type: "image/png" },
          { src: art, sizes: "384x384", type: "image/png" },
          { src: art, sizes: "512x512", type: "image/png" },
        ],
      });
    } catch (e) {
      console.warn("Failed to set MediaSession metadata:", e);
    }
  }, [title, artist, album, artworkUrl]);

  // Register Media Session action handlers (Play, Pause, Next, Prev, Seek)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const actionHandlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => handlersRef.current.onPlay()],
      ["pause", () => handlersRef.current.onPause()],
      ["previoustrack", () => handlersRef.current.onPrevTrack()],
      ["nexttrack", () => handlersRef.current.onNextTrack()],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number" && !isNaN(details.seekTime)) {
            handlersRef.current.onSeek(details.seekTime);
          }
        },
      ],
      [
        "seekbackward",
        (details) => {
          const offset = details.seekOffset || 10;
          const target = Math.max(0, handlersRef.current.currentTime - offset);
          handlersRef.current.onSeek(target);
        },
      ],
      [
        "seekforward",
        (details) => {
          const offset = details.seekOffset || 10;
          const maxDur = handlersRef.current.duration || 999999;
          const target = Math.min(maxDur, handlersRef.current.currentTime + offset);
          handlersRef.current.onSeek(target);
        },
      ],
      ["stop", () => handlersRef.current.onPause()],
    ];

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions may not be supported by all browsers
      }
    });

    return () => {
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      });
    };
  }, []);

  // Synchronize playback state (playing / paused)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [isPlaying]);

  // Synchronize lockscreen timeline & seek position
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !("setPositionState" in navigator.mediaSession)
    ) {
      return;
    }

    if (duration > 0 && currentTime >= 0 && !isNaN(currentTime) && !isNaN(duration)) {
      try {
        const safePosition = Math.min(Math.max(0, currentTime), duration);
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, duration),
          playbackRate: playbackRate || 1,
          position: safePosition,
        });
      } catch {
        // Ignore position state calculation mismatch during track changes
      }
    }
  }, [currentTime, duration, playbackRate]);

  // Background Audio Keep-Alive for mobile devices
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!keepAliveAudioRef.current) {
      const audio = new Audio(SILENT_AUDIO_URI);
      audio.loop = true;
      audio.volume = 0.01;
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      audio.setAttribute("webkit-playsinline", "true");
      keepAliveAudioRef.current = audio;
    }

    const keepAlive = keepAliveAudioRef.current;

    if (isPlaying) {
      keepAlive.play().catch(() => {
        // Autoplay restrictions may require user interaction first
      });
    } else {
      keepAlive.pause();
    }

    return () => {
      if (keepAlive) {
        keepAlive.pause();
      }
    };
  }, [isPlaying]);
}
