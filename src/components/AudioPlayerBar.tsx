"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  Music,
  Download,
  ExternalLink,
  X,
  Sparkles,
  Radio,
  Loader2,
  AlertTriangle,
  Key,
  RotateCcw,
  Film,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Youtube,
  ShieldCheck,
  Smartphone,
  Headphones,
  Sun,
  SunDim,
  PictureInPicture2,
  Info,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";
import { AudioTrack, PlaybackMode } from "@/types/terabox";
import { formatDuration } from "@/lib/formatters";
import { AudioVisualizer } from "./AudioVisualizer";
import { useI18n } from "../context/I18nContext";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useWakeLock } from "@/hooks/useWakeLock";

interface AudioPlayerBarProps {
  playlist: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  ndusCookie?: string;
  cookieStatus?: "none" | "checking" | "valid" | "expired" | "error";
  onPlayTrack: (track: AudioTrack) => void;
  onTogglePlay: () => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onClosePlayer?: () => void;
  onOpenCookieModal?: () => void;
  onDurationLoaded?: (trackId: string, duration: number) => void;
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: "all" | "one" | "off";
  onToggleRepeat?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  playlist,
  currentTrack,
  isPlaying,
  ndusCookie = "",
  cookieStatus = "none",
  onPlayTrack,
  onTogglePlay,
  onPlaybackStateChange,
  onNextTrack,
  onPrevTrack,
  onClosePlayer,
  onOpenCookieModal,
  onDurationLoaded,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
}) => {
  const { t } = useI18n();
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(0.85);
  const [internalShuffle, setInternalShuffle] = useState(false);
  const [internalRepeat, setInternalRepeat] = useState<"all" | "one" | "off">("all");
  const [isBgInfoOpen, setIsBgInfoOpen] = useState(false);
  const { isSupported: isWakeLockSupported, isLocked: isWakeLockActive, toggleWakeLock } = useWakeLock();

  // Handle user volume slider changes
  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, isNaN(newVol) ? 0 : newVol));
    setVolume(clamped);
    if (clamped > 0) {
      prevVolumeRef.current = clamped;
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  }, []);

  // Handle user mute toggle
  const handleToggleMute = useCallback(() => {
    if (isMuted || volume === 0) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.85;
      setVolume(restored);
      setIsMuted(false);
    } else {
      if (volume > 0) {
        prevVolumeRef.current = volume;
      }
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const setPlayingState = useCallback(
    (playing: boolean) => {
      if (onPlaybackStateChange) {
        onPlaybackStateChange(playing);
      } else if (playing !== isPlaying) {
        onTogglePlay();
      }
    },
    [onPlaybackStateChange, isPlaying, onTogglePlay]
  );

  const activeShuffle = isShuffle !== undefined ? isShuffle : internalShuffle;
  const activeRepeat = repeatMode !== undefined ? repeatMode : internalRepeat;

  const handleShuffleToggle = () => {
    if (onToggleShuffle) {
      onToggleShuffle();
    } else {
      setInternalShuffle((prev) => !prev);
    }
  };

  const handleRepeatToggle = () => {
    if (onToggleRepeat) {
      onToggleRepeat();
    } else {
      setInternalRepeat((prev) => (prev === "all" ? "one" : prev === "one" ? "off" : "all"));
    }
  };
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoPos, setVideoPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [videoDragStart, setVideoDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [videoStartPos, setVideoStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [videoSize, setVideoSize] = useState<"normal" | "large">("normal");

  // Dynamic Real-time Rhythm Beat heights for thumbnail equalizer
  const [beatHeights, setBeatHeights] = useState<number[]>([2, 2, 2]);

  // Persistent Playback Source Mode: "terabox" | "youtube"
  const [playbackSourceMode, setPlaybackSourceMode] = useState<"terabox" | "youtube">("terabox");

  // YouTube Fallback State
  const [ytTrack, setYtTrack] = useState<{
    id: string;
    title: string;
    channel?: string;
    duration?: number;
    thumbnailUrl?: string;
  } | null>(null);
  const [isSearchingFallback, setIsSearchingFallback] = useState(false);
  const [isFallbackActive, setIsFallbackActive] = useState(false);

  // Synchronize current track and preserve active mode (stay in YouTube mode until user switches back)
  useEffect(() => {
    setCurrentTime(0);
    setHasError(false);
    setErrorMessage(null);

    // If currentTrack explicitly requested YouTube mode
    if (currentTrack?.youtubeId || currentTrack?.isYoutubeFallback) {
      setPlaybackSourceMode("youtube");
      setIsFallbackActive(true);
    }

    const isCurrentYouTube = playbackSourceMode === "youtube" || currentTrack?.youtubeId || currentTrack?.isYoutubeFallback;

    if (isCurrentYouTube) {
      setIsFallbackActive(true);
      if (currentTrack?.youtubeId) {
        setYtTrack({
          id: currentTrack.youtubeId,
          title: currentTrack.youtubeTitle || currentTrack.name,
          channel: currentTrack.youtubeChannel,
          duration: currentTrack.duration,
          thumbnailUrl: currentTrack.youtubeThumbnail || currentTrack.thumbnailUrl,
        });
        setIsBuffering(false);
        setDuration(currentTrack.duration || 0);
      } else if (currentTrack) {
        // In YouTube mode: stay in YouTube mode for the new song and resolve YouTube track!
        setYtTrack(null);
        setIsBuffering(true);
        triggerYouTubeFallback();
      }
    } else {
      setYtTrack(null);
      setIsFallbackActive(false);
      setDuration(currentTrack?.duration || 0);
    }
  }, [currentTrack?.id, currentTrack?.youtubeId, currentTrack?.isYoutubeFallback, playbackSourceMode]);

  const isYouTubeMode = Boolean(playbackSourceMode === "youtube" || isFallbackActive);
  const activeYtId = ytTrack?.id || currentTrack?.youtubeId;

  // Real-time animation loop for Album Equalizer Bars (following musical rhythm & volume)
  useEffect(() => {
    let animFrame: number;
    const startTime = performance.now();

    let curH1 = 2;
    let curH2 = 2;
    let curH3 = 2;

    const animateBeats = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const effVol = isMuted ? 0 : volume;

      if (isPlaying && !isBuffering && !hasError && effVol > 0) {
        // 128 BPM beat calculation based on actual track currentTime
        const beatTime = (currentTime > 0 ? currentTime : elapsed) * 2.133;
        const kick = Math.pow(Math.max(0, Math.sin(beatTime * Math.PI)), 4);
        const snare = Math.pow(Math.max(0, Math.sin((beatTime - 0.5) * Math.PI)), 5);
        const hihat = Math.pow(Math.max(0, Math.sin(beatTime * 4 * Math.PI)), 2);

        const targetH1 = Math.max(2, (kick * 0.8 + Math.sin(beatTime * 4) * 0.15 + 0.1) * 14 * effVol);
        const targetH2 = Math.max(2, (snare * 0.75 + Math.cos(beatTime * 5.5) * 0.2 + 0.1) * 16 * effVol);
        const targetH3 = Math.max(2, (hihat * 0.7 + Math.sin(beatTime * 8) * 0.2 + 0.1) * 12 * effVol);

        curH1 += (targetH1 - curH1) * 0.35;
        curH2 += (targetH2 - curH2) * 0.35;
        curH3 += (targetH3 - curH3) * 0.35;

        setBeatHeights([curH1, curH2, curH3]);
      } else {
        curH1 += (2 - curH1) * 0.2;
        curH2 += (2 - curH2) * 0.2;
        curH3 += (2 - curH3) * 0.2;
        setBeatHeights([curH1, curH2, curH3]);
      }

      animFrame = requestAnimationFrame(animateBeats);
    };

    animFrame = requestAnimationFrame(animateBeats);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isBuffering, hasError, currentTime, isMuted, volume]);

  // Robust global pointer drag listeners for mini video window
  useEffect(() => {
    if (!isVideoDragging) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - videoDragStart.x;
      const deltaY = e.clientY - videoDragStart.y;

      const maxBoundX = typeof window !== "undefined" ? window.innerWidth : 800;
      const maxBoundY = typeof window !== "undefined" ? window.innerHeight : 600;

      setVideoPos({
        x: Math.max(-maxBoundX, Math.min(maxBoundX, videoStartPos.x + deltaX)),
        y: Math.max(-maxBoundY, Math.min(maxBoundY, videoStartPos.y + deltaY)),
      });
    };

    const handleGlobalPointerUp = () => {
      setIsVideoDragging(false);
    };

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, [isVideoDragging, videoDragStart, videoStartPos]);

  const handleVideoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;
    setIsVideoDragging(true);
    setVideoDragStart({ x: e.clientX, y: e.clientY });
    setVideoStartPos({ x: videoPos.x, y: videoPos.y });
  };

  const isVideoFormat =
    isYouTubeMode ||
    currentTrack?.extension === "mp4" ||
    currentTrack?.category === "video" ||
    currentTrack?.name.endsWith(".mp4");

  // Send command to YouTube iframe via standard postMessage
  const sendYtCommand = useCallback((func: string, args: any[] = []) => {
    if (!ytIframeRef.current?.contentWindow) return;
    try {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func,
          args,
        }),
        "*"
      );
    } catch {
      // ignore
    }
  }, []);

  // Apply volume and mute state cleanly to YouTube iframe
  const applyYouTubeVolume = useCallback(
    (vol: number, muted: boolean) => {
      if (!ytIframeRef.current?.contentWindow) return;
      const isEffMuted = muted || vol <= 0;
      const targetVol = isEffMuted ? 0 : Math.round(Math.max(0, Math.min(1, vol)) * 100);

      try {
        if (isEffMuted) {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "setVolume", args: [0] }),
            "*"
          );
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "mute", args: [] }),
            "*"
          );
        } else {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "unMute", args: [] }),
            "*"
          );
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "setVolume", args: [targetVol] }),
            "*"
          );
        }
      } catch {
        // ignore
      }
    },
    []
  );

  // Safe play helper for HTML5 media
  const safePlay = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || isYouTubeMode) return;

    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      playPromiseRef.current = media.play();
      await playPromiseRef.current;
      setIsBuffering(false);
      setHasError(false);
      setErrorMessage(null);
    } catch (e: any) {
      if (e?.name !== "AbortError" && e?.name !== "NotAllowedError") {
        console.warn("Media play error:", e?.message);
        triggerYouTubeFallback();
      }
      setIsBuffering(false);
    } finally {
      playPromiseRef.current = null;
    }
  }, [isYouTubeMode]);

  // Safe pause helper for HTML5 media
  const safePause = useCallback(async () => {
    const media = mediaRef.current;
    if (!media || isYouTubeMode) return;

    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      media.pause();
      setIsBuffering(false);
    } catch {
      // ignore
    }
  }, [isYouTubeMode]);

  // Automatic YouTube Ad-Free Fallback Function
  const triggerYouTubeFallback = useCallback(async () => {
    if (!currentTrack || isSearchingFallback) return;

    setPlaybackSourceMode("youtube");
    setIsFallbackActive(true);
    setIsSearchingFallback(true);
    setIsBuffering(true);
    setErrorMessage("Mencari lagu di YouTube Bebas Iklan...");

    try {
      const res = await fetch(
        `/api/youtube/search?filename=${encodeURIComponent(currentTrack.name)}&artist=${encodeURIComponent(
          currentTrack.artist || ""
        )}&best=true`
      );
      const data = await res.json();

      if (data.success && data.track?.id) {
        const found = data.track;
        setYtTrack({
          id: found.id,
          title: found.title,
          channel: found.channel,
          duration: found.duration,
          thumbnailUrl: found.thumbnailUrl,
        });
        setIsFallbackActive(true);
        setHasError(false);
        setErrorMessage(null);
        setIsBuffering(false);

        if (found.duration && found.duration > 0) {
          setDuration(found.duration);
          onDurationLoaded?.(currentTrack.id, found.duration);
        }

        // Stop HTML5 media
        if (mediaRef.current) {
          try {
            mediaRef.current.pause();
            mediaRef.current.src = "";
          } catch {}
        }
      } else {
        setHasError(true);
        setErrorMessage("Lagu tidak ditemukan di YouTube. Coba cek koneksi internet.");
      }
    } catch {
      setHasError(true);
      setErrorMessage("Gagal menghubungkan ke YouTube Bebas Iklan.");
    } finally {
      setIsSearchingFallback(false);
      setIsBuffering(false);
    }
  }, [currentTrack, isSearchingFallback, onDurationLoaded]);

  // Handle YouTube iframe load event
  const handleYtIframeLoad = useCallback(() => {
    if (!ytIframeRef.current) return;
    try {
      // Send initial handshake and listening trigger
      ytIframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      );

      // Apply initial volume & mute state cleanly
      applyYouTubeVolume(volume, isMuted);

      if (playbackRate !== 1) {
        sendYtCommand("setPlaybackRate", [playbackRate]);
      }

      // Auto play if isPlaying is true
      if (isPlaying) {
        sendYtCommand("playVideo");
      }
    } catch {
      // ignore
    }
  }, [isPlaying, isMuted, volume, playbackRate, applyYouTubeVolume, sendYtCommand]);

  // Sync YouTube playback controls (play/pause)
  useEffect(() => {
    if (!isYouTubeMode) return;

    if (isPlaying) {
      sendYtCommand("playVideo");
    } else {
      sendYtCommand("pauseVideo");
    }
  }, [isPlaying, isYouTubeMode, sendYtCommand]);

  // Sync YouTube volume & mute
  useEffect(() => {
    if (!isYouTubeMode) return;
    applyYouTubeVolume(volume, isMuted);
  }, [volume, isMuted, isYouTubeMode, applyYouTubeVolume]);

  // Sync YouTube playback rate
  useEffect(() => {
    if (!isYouTubeMode) return;
    sendYtCommand("setPlaybackRate", [playbackRate]);
  }, [playbackRate, isYouTubeMode, sendYtCommand]);

  // Unified Media Ended handler
  const handleEnded = useCallback(() => {
    if (activeRepeat === "one") {
      setCurrentTime(0);
      if (isYouTubeMode) {
        sendYtCommand("seekTo", [0, true]);
        sendYtCommand("playVideo");
      } else if (mediaRef.current) {
        mediaRef.current.currentTime = 0;
        safePlay();
      }
    } else {
      onNextTrack();
    }
  }, [activeRepeat, isYouTubeMode, sendYtCommand, safePlay, onNextTrack]);

  const handleEndedRef = useRef(handleEnded);
  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  // YouTube IFrame Message Listener for time updates & state events
  useEffect(() => {
    if (!isYouTubeMode) return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let msgData = event.data;
        if (typeof msgData === "string") {
          try {
            msgData = JSON.parse(msgData);
          } catch {
            return;
          }
        }

        if (!msgData || typeof msgData !== "object") return;

        if (msgData?.event === "onReady") {
          if (isPlaying) {
            sendYtCommand("playVideo");
          }
          applyYouTubeVolume(volume, isMuted);
          setIsBuffering(false);
          setHasError(false);
        }

        // InfoDelivery, state changes, or direct info payloads from YouTube iframe
        const info = msgData.info || msgData.data;
        if (info && typeof info === "object") {
          if (typeof info.currentTime === "number" && !isNaN(info.currentTime) && info.currentTime >= 0) {
            setCurrentTime(info.currentTime);
          }
          if (typeof info.duration === "number" && info.duration > 0 && !isNaN(info.duration)) {
            setDuration(info.duration);
            if (currentTrack) {
              onDurationLoaded?.(currentTrack.id, info.duration);
            }
          }

          // Bidirectional Mute & Volume synchronization from native YouTube player
          if (typeof info.muted === "boolean") {
            setIsMuted(info.muted);
          }
          if (typeof info.volume === "number" && !isNaN(info.volume)) {
            const rawVol = Math.max(0, Math.min(100, info.volume));
            const newVol = rawVol / 100;
            if (rawVol === 0) {
              setIsMuted(true);
            } else {
              setVolume((prevVol) => {
                if (Math.abs(prevVol - newVol) > 0.02) {
                  prevVolumeRef.current = newVol;
                  return newVol;
                }
                return prevVol;
              });
            }
          }

          if (info.playerState === 0) {
            // Ended
            handleEndedRef.current();
          } else if (info.playerState === 1) {
            // Playing
            setIsBuffering(false);
            setHasError(false);
            setPlayingState(true);
          } else if (info.playerState === 2) {
            // Paused
            setIsBuffering(false);
            setPlayingState(false);
          } else if (info.playerState === 3) {
            // Buffering
            setIsBuffering(true);
          }
        } else if (msgData?.event === "onVolumeChange" || msgData?.event === "volumeChange") {
          const vData = msgData.data || msgData.info;
          if (vData) {
            if (typeof vData.muted === "boolean") {
              setIsMuted(vData.muted);
            }
            if (typeof vData.volume === "number" && !isNaN(vData.volume)) {
              const rawVol = Math.max(0, Math.min(100, vData.volume));
              const newVol = rawVol / 100;
              if (rawVol === 0) {
                setIsMuted(true);
              } else {
                setVolume(newVol);
                prevVolumeRef.current = newVol;
              }
            }
          }
        } else if (msgData?.event === "onStateChange") {
          if (msgData.data === 0) {
            handleEndedRef.current();
          } else if (msgData.data === 1) {
            setIsBuffering(false);
            setHasError(false);
            setPlayingState(true);
          } else if (msgData.data === 2) {
            setIsBuffering(false);
            setPlayingState(false);
          } else if (msgData.data === 3) {
            setIsBuffering(true);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [isYouTubeMode, currentTrack, isPlaying, isMuted, volume, onDurationLoaded, sendYtCommand, setPlayingState]);

  // Real-time smooth timer ticker for YouTube mode playback (continuous 0:00 -> 0:01 -> 0:02...)
  useEffect(() => {
    if (!isYouTubeMode || !isPlaying || isBuffering) return;

    let lastTick = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;

      setCurrentTime((prev) => {
        const next = prev + delta * playbackRate;
        if (duration > 0 && next >= duration) {
          return duration;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isYouTubeMode, isPlaying, isBuffering, duration, playbackRate]);

  // Polling backup timer for seekbar updates during YouTube playback
  useEffect(() => {
    if (!isYouTubeMode || !isPlaying) return;

    const timer = setInterval(() => {
      sendYtCommand("getCurrentTime");
    }, 500);

    return () => clearInterval(timer);
  }, [isYouTubeMode, isPlaying, sendYtCommand]);

  // Sync TeraBox HTML5 media source (when not in YouTube mode)
  useEffect(() => {
    if (isYouTubeMode || !mediaRef.current || !currentTrack) return;

    const media = mediaRef.current;
    setHasError(false);
    setErrorMessage(null);

    const targetUrl = currentTrack.streamUrl || currentTrack.downloadUrl || "";

    if (!targetUrl) {
      console.warn("TeraBox URL missing, auto-fallback to YouTube...");
      triggerYouTubeFallback();
      return;
    }

    const isDifferentSrc = !media.src || (!media.src.endsWith(targetUrl) && media.src !== targetUrl);

    if (isDifferentSrc) {
      if (isPlaying) {
        setIsBuffering(true);
        try {
          media.pause();
        } catch {}
        media.src = targetUrl;
        media.load();
        safePlay();
      } else {
        media.src = targetUrl;
        setIsBuffering(false);
      }
    } else {
      if (isPlaying && media.paused) {
        safePlay();
      } else if (!isPlaying && !media.paused) {
        safePause();
      }
    }
  }, [currentTrack?.id, currentTrack?.streamUrl, isPlaying, isYouTubeMode, safePlay, safePause, triggerYouTubeFallback]);

  // Volume & Speed effects for HTML5 media
  useEffect(() => {
    if (!mediaRef.current || isYouTubeMode) return;
    const isEffMuted = isMuted || volume <= 0;
    const safeVol = isEffMuted ? 0 : Math.max(0, Math.min(1, volume));
    mediaRef.current.volume = safeVol;
    mediaRef.current.muted = isEffMuted;
  }, [volume, isMuted, isYouTubeMode]);

  // Mute & pause HTML5 media when in YouTube mode
  useEffect(() => {
    if (isYouTubeMode && mediaRef.current) {
      try {
        mediaRef.current.pause();
        mediaRef.current.muted = true;
        mediaRef.current.volume = 0;
      } catch {}
    }
  }, [isYouTubeMode]);

  useEffect(() => {
    if (!mediaRef.current || isYouTubeMode) return;
    mediaRef.current.playbackRate = playbackRate;
  }, [playbackRate, isYouTubeMode]);

  // Media Event Handlers for HTML5 media
  const updateMediaDuration = useCallback(() => {
    if (!mediaRef.current || isYouTubeMode) return;
    const realDur = mediaRef.current.duration;
    if (realDur && !isNaN(realDur) && isFinite(realDur) && realDur > 0) {
      setDuration(realDur);
      if (currentTrack) {
        onDurationLoaded?.(currentTrack.id, realDur);
      }
    }
  }, [currentTrack, isYouTubeMode, onDurationLoaded]);

  const handleTimeUpdate = () => {
    if (mediaRef.current && !isYouTubeMode) {
      setCurrentTime(mediaRef.current.currentTime);
      if (duration === 0 && mediaRef.current.duration > 0) {
        updateMediaDuration();
      }
      if (isBuffering && !mediaRef.current.paused) {
        setIsBuffering(false);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!isYouTubeMode) {
      updateMediaDuration();
      setIsBuffering(false);
      setHasError(false);
    }
  };

  const handleDurationChange = () => {
    if (!isYouTubeMode) updateMediaDuration();
  };

  const handleCanPlay = () => {
    if (!isYouTubeMode) {
      updateMediaDuration();
      setIsBuffering(false);
      setHasError(false);
    }
  };

  const handleHtml5VolumeChange = () => {
    if (mediaRef.current && !isYouTubeMode) {
      const isMediaMuted = mediaRef.current.muted || mediaRef.current.volume === 0;
      setIsMuted(isMediaMuted);
      if (!isMediaMuted && mediaRef.current.volume > 0) {
        setVolume(mediaRef.current.volume);
        prevVolumeRef.current = mediaRef.current.volume;
      }
    }
  };

  const handleWaiting = () => {
    if (isPlaying && !isYouTubeMode) {
      setIsBuffering(true);
    }
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setHasError(false);
  };

  const handleError = () => {
    console.warn("TeraBox HTML5 media error detected, triggering auto YouTube fallback...");
    triggerYouTubeFallback();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (isYouTubeMode) {
      sendYtCommand("seekTo", [newTime, true]);
    } else if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    setPlaybackRate(speeds[nextIdx]);
  };

  const handleSwitchToTeraBox = () => {
    setPlaybackSourceMode("terabox");
    setIsFallbackActive(false);
    setYtTrack(null);
    setCurrentTime(0);
    setHasError(false);
    setErrorMessage(null);
    if (currentTrack) {
      currentTrack.isYoutubeFallback = false;
      currentTrack.sourceType = "terabox-live";
    }
  };

  const activeTitle = (isYouTubeMode && ytTrack?.title ? ytTrack.title : currentTrack?.name) || "TeraPlay Audio";
  const activeArtist = (isYouTubeMode && ytTrack?.channel ? ytTrack.channel : currentTrack?.artist) || "TeraBox Music";
  const activeThumbnail = (isYouTubeMode && ytTrack?.thumbnailUrl) || currentTrack?.thumbnailUrl || "/icon.svg";

  // Native Web MediaSession API Hook for Lock Screen, Smartwatch & Bluetooth earphone controls
  useMediaSession({
    title: activeTitle,
    artist: activeArtist,
    album: currentTrack?.album || (isYouTubeMode ? "YouTube (Bebas Iklan)" : "TeraPlay Audio"),
    artworkUrl: activeThumbnail,
    duration,
    currentTime,
    isPlaying,
    playbackRate,
    onPlay: () => {
      setPlayingState(true);
    },
    onPause: () => {
      setPlayingState(false);
    },
    onNextTrack,
    onPrevTrack,
    onSeek: (newTime: number) => {
      setCurrentTime(newTime);
      if (isYouTubeMode) {
        sendYtCommand("seekTo", [newTime, true]);
      } else if (mediaRef.current) {
        mediaRef.current.currentTime = newTime;
      }
    },
  });

  const handleTogglePiP = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (mediaRef.current instanceof HTMLVideoElement && document.pictureInPictureEnabled) {
        await mediaRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP toggle error:", err);
    }
  }, []);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Draggable Mini Video Floating Window (Unified container for both TeraBox MP4 and YouTube Video) */}
      <div
        style={{
          transform: `translate3d(${videoPos.x}px, ${videoPos.y}px, 0)`,
          transition: isVideoDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: isVideoDragging ? "transform" : "auto",
        }}
        className={
          showVideoPreview && isVideoFormat
            ? `fixed bottom-36 md:bottom-24 right-2 sm:right-4 z-50 w-[calc(100vw-1rem)] sm:w-80 ${
                videoSize === "large" ? "md:w-[480px]" : "md:w-80"
              } rounded-2xl border ${
                isYouTubeMode
                  ? "border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]"
                  : "border-slate-200 dark:border-emerald-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
              } bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl overflow-hidden flex flex-col ${
                isVideoDragging ? "ring-2 ring-emerald-400 select-none cursor-grabbing" : ""
              }`
            : isYouTubeMode && activeYtId
            ? "fixed bottom-24 right-4 z-[-1] w-[320px] h-[180px] opacity-[0.001] pointer-events-none overflow-hidden"
            : "hidden"
        }
      >
        {/* Mini Window Drag Header (shown when visible) */}
        {showVideoPreview && (
          <div
            onPointerDown={handleVideoPointerDown}
            style={{ touchAction: "none" }}
            className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${
              isYouTubeMode
                ? "from-slate-100 via-rose-100/50 to-slate-100 dark:from-slate-900 dark:via-rose-950/40 dark:to-slate-900"
                : "from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
            } border-b border-slate-200 dark:border-white/10 cursor-grab active:cursor-grabbing select-none`}
            title="Tahan & geser untuk memindahkan video ke mana saja"
          >
            <div className="flex items-center gap-1.5 truncate min-w-0 pr-2">
              <GripHorizontal
                className={`w-3.5 h-3.5 ${isYouTubeMode ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"} shrink-0`}
              />
              <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {activeTitle}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleTogglePiP}
                className="btn-icon p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                title={t.player.pipButton || "Picture-in-Picture (Layar Melayang)"}
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setVideoSize(videoSize === "large" ? "normal" : "large")}
                className="btn-icon p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                title={videoSize === "large" ? "Perkecil ukuran" : "Perbesar ukuran"}
              >
                {videoSize === "large" ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              {(videoPos.x !== 0 || videoPos.y !== 0) && (
                <button
                  onClick={() => setVideoPos({ x: 0, y: 0 })}
                  className="btn-icon btn-icon-spin p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Reset posisi"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowVideoPreview(false)}
                className="btn-icon btn-icon-close p-1 rounded text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20"
                title="Tutup mini player (audio tetap berjalan)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Unified Player Canvas Container */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden w-full h-full">
          {isYouTubeMode && activeYtId ? (
            <iframe
              ref={ytIframeRef}
              key={activeYtId}
              src={`https://www.youtube-nocookie.com/embed/${activeYtId}?enablejsapi=1&autoplay=1&origin=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.origin : ""
              )}&iv_load_policy=3&modestbranding=1&rel=0&playsinline=1&controls=1`}
              title={activeTitle}
              onLoad={handleYtIframeLoad}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-full h-full border-0 pointer-events-auto"
            />
          ) : (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              preload="metadata"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleDurationChange}
              onVolumeChange={handleHtml5VolumeChange}
              onCanPlay={handleCanPlay}
              onWaiting={handleWaiting}
              onPlaying={() => {
                setPlayingState(true);
                setIsBuffering(false);
                setHasError(false);
              }}
              onPlay={() => {
                setPlayingState(true);
                setIsBuffering(false);
                setHasError(false);
              }}
              onPause={() => {
                setPlayingState(false);
                setIsBuffering(false);
              }}
              onError={handleError}
              onEnded={handleEnded}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* HTML5 Audio Player element when not in mini-video and not in YouTube mode */}
      {!isYouTubeMode && !showVideoPreview && (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          preload="auto"
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onVolumeChange={handleHtml5VolumeChange}
          onCanPlay={handleCanPlay}
          onWaiting={handleWaiting}
          onPlaying={() => {
            setPlayingState(true);
            setIsBuffering(false);
            setHasError(false);
          }}
          onPlay={() => {
            setPlayingState(true);
            setIsBuffering(false);
            setHasError(false);
          }}
          onPause={() => {
            setPlayingState(false);
            setIsBuffering(false);
          }}
          onError={handleError}
          onEnded={handleEnded}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "1px",
            height: "1px",
            opacity: 0.001,
            pointerEvents: "none",
            zIndex: -1,
          }}
          aria-hidden="true"
        />
      )}

      {/* Main Floating Deck */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-2 sm:px-4 pb-2 sm:pb-3 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          {/* Fallback & Notification Drawer if Error Occurred */}
          {hasError && (
            <div className="mb-2 p-3 sm:p-3.5 rounded-2xl glass-panel bg-rose-50/95 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-500/40 shadow-2xl modal-content-animate text-xs text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
                <div>
                  <p className="font-bold text-rose-950 dark:text-white text-xs">
                    {errorMessage || "Streaming media TeraBox gagal dimuat."}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    {cookieStatus === "expired"
                      ? "Cookie ndus Anda sudah KEDALUWARSA. Sistem dapat memutar otomatis dari YouTube (Bebas Iklan)."
                      : "Stream TeraBox sedang bermasalah. Anda dapat beralih otomatis ke YouTube Bebas Iklan."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={triggerYouTubeFallback}
                  disabled={isSearchingFallback}
                  className="btn-icon btn-icon-wiggle flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold shadow text-xs"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>{isSearchingFallback ? "Mencari di YouTube..." : "Putar via YouTube Bebas Iklan"}</span>
                </button>
                {(!ndusCookie || cookieStatus === "expired") && onOpenCookieModal && (
                  <button
                    onClick={onOpenCookieModal}
                    className="btn-icon btn-icon-wiggle flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow text-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Cookie ndus</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Queue Drawer */}
          {isQueueOpen && (
            <div className="mb-2 p-3 sm:p-4 rounded-3xl glass-panel bg-white/98 dark:bg-slate-950/95 border border-slate-200 dark:border-white/10 shadow-2xl modal-content-animate">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Active Playlist Queue ({playlist.length} Tracks)
                  </h3>
                </div>
                <button
                  onClick={() => setIsQueueOpen(false)}
                  className="btn-icon btn-icon-close p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {playlist.map((track, idx) => {
                  const isCurrent = track.id === currentTrack.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => onPlayTrack(track)}
                      className={`btn-interactive flex items-center justify-between p-2.5 rounded-xl text-xs border ${
                        isCurrent
                          ? isYouTubeMode
                            ? "bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-white font-bold"
                            : "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-950 dark:text-white font-bold"
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{track.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {track.artist || "TeraBox Music"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {track.formattedDuration || formatDuration(track.duration || 0)}
                        </span>
                        {isCurrent && (
                          <div className="flex items-end gap-[2px] h-3.5">
                            <span
                              className="w-[2px] rounded-full transition-all"
                              style={{
                                height: `${beatHeights[0]}px`,
                                backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                              }}
                            />
                            <span
                              className="w-[2px] rounded-full transition-all"
                              style={{
                                height: `${beatHeights[1]}px`,
                                backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                              }}
                            />
                            <span
                              className="w-[2px] rounded-full transition-all"
                              style={{
                                height: `${beatHeights[2]}px`,
                                backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player Main Container */}
          <div
            className={`relative rounded-3xl glass-panel bg-white/95 dark:bg-slate-950/95 border ${
              isYouTubeMode
                ? "border-rose-400 dark:border-rose-500/40 shadow-[0_12px_45px_rgba(244,63,94,0.22)]"
                : "border-slate-200 dark:border-emerald-500/30 shadow-[0_12px_45px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.85)]"
            } backdrop-blur-2xl px-3 sm:px-5 py-2.5 sm:py-3 text-slate-800 dark:text-slate-200 transition-colors duration-300`}
          >
            {/* Top Slim Progress Bar Indicator */}
            <div className="absolute top-0 left-4 right-4 h-1 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  isYouTubeMode
                    ? "bg-gradient-to-r from-rose-500 via-red-400 to-amber-400"
                    : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
                } transition-all duration-150`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* ========================================================================= */}
            {/* MOBILE LAYOUT (< md)                                                      */}
            {/* ========================================================================= */}
            <div className="flex md:hidden flex-col gap-2 pt-1">
              {/* Mobile Row 1: Track Info & Quick Actions */}
              <div className="flex items-center justify-between gap-2">
                {/* Track Info (Thumb + Title + Artist + Badge) */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Album Cover with Real-time Beat Equalizer */}
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm">
                    {activeThumbnail ? (
                      <img
                        src={activeThumbnail}
                        alt={activeTitle}
                        className={`w-full h-full object-cover transition-transform duration-300 ${isPlaying ? "scale-110" : ""}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-100 to-slate-100 dark:from-emerald-950 dark:to-slate-900 text-emerald-600 dark:text-emerald-400">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    {isPlaying && !hasError && (
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] flex items-center justify-center">
                        <div className="flex items-end gap-[1.5px] h-3.5">
                          <span
                            className="w-[2.5px] rounded-full transition-all duration-75"
                            style={{
                              height: `${beatHeights[0]}px`,
                              backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                            }}
                          />
                          <span
                            className="w-[2.5px] rounded-full transition-all duration-75"
                            style={{
                              height: `${beatHeights[1]}px`,
                              backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                            }}
                          />
                          <span
                            className="w-[2.5px] rounded-full transition-all duration-75"
                            style={{
                              height: `${beatHeights[2]}px`,
                              backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title & Artist & Badge */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`font-bold text-xs text-slate-900 dark:text-white truncate ${
                        isYouTubeMode ? "hover:text-rose-600 dark:hover:text-rose-400" : "hover:text-emerald-600 dark:hover:text-emerald-400"
                      }`}
                    >
                      {activeTitle}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate flex-wrap">
                      <span className="truncate max-w-[85px] font-medium text-slate-700 dark:text-slate-300">
                        {activeArtist}
                      </span>
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                      {isBuffering ? (
                        <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-500/20 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buffering...
                        </span>
                      ) : isYouTubeMode ? (
                        <span className="shrink-0 flex items-center gap-0.5 font-semibold text-rose-600 dark:text-rose-400 text-[9px] bg-rose-50 dark:bg-rose-500/15 px-1 py-0.2 rounded border border-rose-200 dark:border-rose-500/30">
                          <ShieldCheck className="w-2.5 h-2.5 text-rose-500 animate-pulse" /> Bebas Iklan
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400 text-[9px] bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/20">
                          <Radio className="w-2 h-2 text-emerald-600 animate-pulse" /> Live
                        </span>
                      )}
                      <button
                        onClick={() => setIsBgInfoOpen(true)}
                        className="shrink-0 flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300 text-[9px] bg-sky-50 dark:bg-sky-500/15 px-1.5 py-0.2 rounded-md border border-sky-200 dark:border-sky-500/30 active:scale-95 transition-transform"
                        title="Mode Latar Belakang Aktif. Klik untuk info lengkap."
                      >
                        <Smartphone className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400 animate-pulse" />
                        <span>Latar Belakang</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Mobile Actions: WakeLock, Mute Toggle, Video toggle, Queue, Close */}
                <div className="flex items-center gap-1 shrink-0">
                  {isWakeLockSupported && (
                    <button
                      onClick={toggleWakeLock}
                      className={`btn-icon p-1.5 rounded-xl border text-xs transition-colors ${
                        isWakeLockActive
                          ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      }`}
                      title={isWakeLockActive ? "Layar Tetap Hidup: AKTIF (Layar tidak akan otomatis mati)" : "Layar Tetap Hidup: NONAKTIF"}
                    >
                      <Sun className={`w-3.5 h-3.5 ${isWakeLockActive ? "text-amber-500 fill-amber-500" : ""}`} />
                    </button>
                  )}

                  <button
                    onClick={handleToggleMute}
                    className={`btn-icon p-1.5 rounded-xl border text-xs transition-colors ${
                      isMuted || volume === 0
                        ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/40 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                    }`}
                    title={isMuted || volume === 0 ? "Bunyikan (Unmute)" : "Bisukan (Mute)"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isVideoFormat && (
                    <button
                      onClick={() => setShowVideoPreview(!showVideoPreview)}
                      className={`btn-icon btn-icon-wiggle p-1.5 rounded-xl border text-xs ${
                        showVideoPreview
                          ? isYouTubeMode
                            ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 border-rose-200 dark:border-rose-500/40 shadow-sm"
                            : "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 border-cyan-200 dark:border-cyan-500/40 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      }`}
                      title="Tampilkan / Sembunyikan Video"
                    >
                      <Film className={`w-3.5 h-3.5 ${isYouTubeMode ? "text-rose-500" : "text-cyan-600"}`} />
                    </button>
                  )}

                  <button
                    onClick={() => setIsQueueOpen(!isQueueOpen)}
                    className={`btn-icon btn-icon-bounce-y p-1.5 rounded-xl border text-xs relative ${
                      isQueueOpen
                        ? isYouTubeMode
                          ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 border-rose-200 dark:border-rose-500/40 shadow-sm"
                          : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 border-emerald-200 dark:border-emerald-500/40 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                    }`}
                    title="Daftar Putar"
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    {playlist.length > 0 && (
                      <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] text-[8px] font-bold rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                        {playlist.length}
                      </span>
                    )}
                  </button>

                  {onClosePlayer && (
                    <button
                      onClick={onClosePlayer}
                      className="btn-icon btn-icon-close p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Tutup pemutar musik"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Row 2: Seekbar & Timers (Full Width Touch Target) */}
              <div className="w-full flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 px-0.5">
                <span className="w-8 text-right text-slate-700 dark:text-slate-300 shrink-0 select-none">
                  {formatDuration(currentTime, true, "0:00")}
                </span>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration > 0 ? duration : 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className={`w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer ${
                      isYouTubeMode ? "accent-rose-500 dark:accent-rose-400" : "accent-emerald-500 dark:accent-emerald-400"
                    } focus:outline-none`}
                  />
                </div>
                <span className="w-8 text-left shrink-0 select-none">
                  {duration > 0 ? formatDuration(duration, true, "--:--") : "--:--"}
                </span>
              </div>

              {/* Mobile Row 3: Playback Controls (Shuffle, Prev, Play, Next, Repeat, Speed) */}
              <div className="flex items-center justify-between px-1 pt-0.5">
                {/* Shuffle */}
                <button
                  onClick={handleShuffleToggle}
                  className={`btn-icon btn-icon-wiggle p-2 rounded-xl transition-all ${
                    activeShuffle
                      ? isYouTubeMode
                        ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40"
                        : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title={activeShuffle ? t.player.shuffleOn : t.player.shuffleOff}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Prev */}
                <button
                  onClick={onPrevTrack}
                  className="btn-icon btn-icon-bounce-x p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Lagu Sebelumnya"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                {/* Primary Play / Pause */}
                <button
                  onClick={onTogglePlay}
                  className={`btn-icon flex items-center justify-center w-11 h-11 rounded-full ${
                    isYouTubeMode
                      ? "bg-gradient-to-tr from-rose-500 to-red-500 shadow-rose-500/30 text-white shadow-lg"
                      : "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30 text-slate-950 shadow-lg"
                  } font-bold hover:scale-105 active:scale-95 transition-transform`}
                >
                  {isBuffering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={onNextTrack}
                  className="btn-icon btn-icon-bounce-x p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Lagu Berikutnya"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                {/* Repeat */}
                <button
                  onClick={handleRepeatToggle}
                  className={`btn-icon btn-icon-spin p-2 rounded-xl transition-all ${
                    activeRepeat !== "off"
                      ? isYouTubeMode
                        ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40"
                        : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title={
                    activeRepeat === "one"
                      ? t.player.repeatOne
                      : activeRepeat === "all"
                      ? t.player.repeatAll
                      : t.player.repeatOff
                  }
                >
                  {activeRepeat === "one" ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </button>

                {/* Speed toggle */}
                <button
                  onClick={cycleSpeed}
                  className={`btn-interactive px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-800 ${
                    playbackRate !== 1
                      ? isYouTubeMode
                        ? "text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40 font-black"
                        : "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40 font-black"
                      : ""
                  }`}
                  title={t.player.speed}
                >
                  {playbackRate}x
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DESKTOP & TABLET LAYOUT (hidden md:grid grid-cols-12 items-center)       */}
            {/* ========================================================================= */}
            <div className="hidden md:grid grid-cols-12 items-center gap-2 lg:gap-4 pt-1">
              {/* Left: Track Info (Col 1-3) */}
              <div className="col-span-3 lg:col-span-3 xl:col-span-3 min-w-0 flex items-center gap-2.5 lg:gap-3">
                {/* Album Cover / Disc with Real-time Reactive Equalizer */}
                <div className="relative w-11 h-11 lg:w-12 lg:h-12 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-md">
                  {activeThumbnail ? (
                    <img
                      src={activeThumbnail}
                      alt={activeTitle}
                      className={`w-full h-full object-cover transition-transform duration-300 ${isPlaying ? "scale-110" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-100 to-slate-100 dark:from-emerald-950 dark:to-slate-900 text-emerald-600 dark:text-emerald-400">
                      <Music className="w-5 h-5" />
                    </div>
                  )}
                  {isPlaying && !hasError && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] flex items-center justify-center">
                      <div className="flex items-end gap-[2px] h-4">
                        <span
                          className="w-[3px] rounded-full transition-all duration-75"
                          style={{
                            height: `${beatHeights[0]}px`,
                            backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                          }}
                        />
                        <span
                          className="w-[3px] rounded-full transition-all duration-75"
                          style={{
                            height: `${beatHeights[1]}px`,
                            backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                          }}
                        />
                        <span
                          className="w-[3px] rounded-full transition-all duration-75"
                          style={{
                            height: `${beatHeights[2]}px`,
                            backgroundColor: isYouTubeMode ? "#f43f5e" : "#10b981",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Name, Artist, Source & Ad-Free Badge */}
                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-bold text-xs lg:text-sm text-slate-900 dark:text-white truncate ${
                      isYouTubeMode ? "hover:text-rose-600 dark:hover:text-rose-400" : "hover:text-emerald-600 dark:hover:text-emerald-400"
                    } transition-colors`}
                    title={activeTitle}
                  >
                    {activeTitle}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-nowrap min-w-0">
                    <span className="truncate min-w-0 font-medium text-slate-700 dark:text-slate-300" title={activeArtist}>
                      {activeArtist}
                    </span>
                    <span className="shrink-0 inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    {isBuffering ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20 whitespace-nowrap animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buffering...
                      </span>
                    ) : isYouTubeMode ? (
                      <span className="shrink-0 inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 text-[10px] bg-rose-50 dark:bg-rose-500/15 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/30 whitespace-nowrap">
                        <ShieldCheck className="w-2.5 h-2.5 text-rose-500 shrink-0" /> {t.player.adFreeTag}
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[10px] bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap">
                        <Radio className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> TeraBox Live
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: Controls + Full-Width Seekbar (Col 4-9) */}
              <div className="col-span-6 lg:col-span-6 xl:col-span-6 flex flex-col items-center justify-center px-1 lg:px-4 min-w-0">
                {/* Control Buttons */}
                <div className="flex items-center gap-2 sm:gap-3.5 mb-1.5">
                  {/* Dedicated Shuffle Button */}
                  <button
                    onClick={handleShuffleToggle}
                    className={`btn-icon btn-icon-wiggle relative p-2 rounded-xl transition-all ${
                      activeShuffle
                        ? isYouTubeMode
                          ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 shadow-sm"
                          : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                    title={activeShuffle ? t.player.shuffleOn : t.player.shuffleOff}
                  >
                    <Shuffle className="w-4 h-4" />
                    {activeShuffle && (
                      <span
                        className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                          isYouTubeMode ? "bg-rose-500 dark:bg-rose-400" : "bg-emerald-500 dark:bg-emerald-400"
                        } animate-pulse`}
                      />
                    )}
                  </button>

                  {/* Previous Track */}
                  <button
                    onClick={onPrevTrack}
                    className="btn-icon btn-icon-bounce-x p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    title="Lagu Sebelumnya"
                  >
                    <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </button>

                  {/* Play / Pause Primary */}
                  <button
                    onClick={onTogglePlay}
                    className={`btn-icon flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full ${
                      isYouTubeMode
                        ? "bg-gradient-to-tr from-rose-500 to-red-500 shadow-rose-500/30 text-white shadow-lg"
                        : "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30 text-slate-950 shadow-lg"
                    } font-bold hover:scale-105 active:scale-95 transition-transform`}
                  >
                    {isBuffering ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Next Track */}
                  <button
                    onClick={onNextTrack}
                    className="btn-icon btn-icon-bounce-x p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    title="Lagu Berikutnya"
                  >
                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </button>

                  {/* Dedicated Repeat Mode Button */}
                  <button
                    onClick={handleRepeatToggle}
                    className={`btn-icon btn-icon-spin p-2 rounded-xl transition-all ${
                      activeRepeat !== "off"
                        ? isYouTubeMode
                          ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 shadow-sm"
                          : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 shadow-sm"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                    title={
                      activeRepeat === "one"
                        ? t.player.repeatOne
                        : activeRepeat === "all"
                        ? t.player.repeatAll
                        : t.player.repeatOff
                    }
                  >
                    {activeRepeat === "one" ? (
                      <Repeat1 className="w-4 h-4" />
                    ) : activeRepeat === "all" ? (
                      <Repeat className="w-4 h-4" />
                    ) : (
                      <Repeat className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </button>

                  {/* Speed toggle */}
                  <button
                    onClick={cycleSpeed}
                    className={`btn-interactive px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 ${
                      isYouTubeMode ? "hover:text-rose-600 dark:hover:text-rose-300" : "hover:text-emerald-600 dark:hover:text-emerald-300"
                    } hover:bg-slate-100 dark:hover:bg-slate-800/80 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700/60`}
                    title={t.player.speed}
                  >
                    {playbackRate}x
                  </button>
                </div>

                {/* Seekbar and Timers */}
                <div className="w-full flex items-center gap-2.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="w-9 text-right text-slate-700 dark:text-slate-300 shrink-0 font-medium tabular-nums select-none">
                    {formatDuration(currentTime, true, "0:00")}
                  </span>
                  <div className="relative flex-1 group flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className={`w-full h-1.5 group-hover:h-2 transition-all bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer ${
                        isYouTubeMode ? "accent-rose-500 dark:accent-rose-400" : "accent-emerald-500 dark:accent-emerald-400"
                      } focus:outline-none`}
                    />
                  </div>
                  <span className="w-9 text-left shrink-0 font-medium tabular-nums select-none">
                    {duration > 0 ? formatDuration(duration, true, "--:--") : "--:--"}
                  </span>
                </div>
              </div>

              {/* Right: Quick Tools (Col 10-12) */}
              <div className="col-span-3 lg:col-span-3 xl:col-span-3 flex items-center justify-end gap-1.5 lg:gap-2">
                {/* Switch Mode Button */}
                {isYouTubeMode ? (
                  <button
                    onClick={handleSwitchToTeraBox}
                    className="btn-icon p-2 rounded-xl text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    title="Beralih ke stream TeraBox (Cloud Direct)"
                  >
                    <Radio className="w-4 h-4 text-emerald-500" />
                  </button>
                ) : (
                  <button
                    onClick={triggerYouTubeFallback}
                    disabled={isSearchingFallback}
                    className="btn-icon p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    title="Putar versi YouTube Bebas Iklan"
                  >
                    <Youtube className="w-4 h-4 text-rose-500" />
                  </button>
                )}

                {/* High-Energy Rhythm Visualizer in deck */}
                <div className="hidden xl:block w-16 2xl:w-20 h-6 shrink-0">
                  <AudioVisualizer
                    isPlaying={isPlaying && !isBuffering && !hasError}
                    audioElement={mediaRef.current}
                    currentTime={currentTime}
                    volume={isMuted ? 0 : volume}
                    barCount={10}
                    height={24}
                    theme={isYouTubeMode ? "rose" : "emerald"}
                    showPeaks={true}
                  />
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleToggleMute}
                    className="btn-icon p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={isMuted || volume === 0 ? "Bunyikan (Unmute)" : "Bisukan (Mute)"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className={`w-12 lg:w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer ${
                      isYouTubeMode ? "accent-rose-500 dark:accent-rose-400" : "accent-emerald-500 dark:accent-emerald-400"
                    }`}
                  />
                </div>

                {/* Wake Lock Toggle Button (Desktop) */}
                {isWakeLockSupported && (
                  <button
                    onClick={toggleWakeLock}
                    className={`btn-icon p-2 rounded-xl text-xs transition-colors ${
                      isWakeLockActive
                        ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                    title={isWakeLockActive ? t.player.wakeLockOn || "Layar Tetap Hidup: AKTIF" : t.player.wakeLockOff || "Layar Tetap Hidup: MATI"}
                  >
                    <Sun className={`w-4 h-4 ${isWakeLockActive ? "text-amber-500 fill-amber-500 animate-spin-slow" : ""}`} />
                  </button>
                )}

                {/* Video Preview Toggle Button */}
                {isVideoFormat && (
                  <button
                    onClick={() => setShowVideoPreview(!showVideoPreview)}
                    className={`btn-icon p-2 rounded-xl text-xs transition-colors ${
                      showVideoPreview
                        ? isYouTubeMode
                          ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 shadow-sm"
                          : "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/40 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    }`}
                    title={showVideoPreview ? "Sembunyikan Video" : "Tampilkan Video (Mini Player Bebas Iklan)"}
                  >
                    <Film className={`w-4 h-4 ${isYouTubeMode ? "text-rose-500" : "text-cyan-600"}`} />
                  </button>
                )}

                {/* Playlist Queue Button */}
                <button
                  onClick={() => setIsQueueOpen(!isQueueOpen)}
                  className={`btn-icon p-2 rounded-xl text-xs relative transition-colors ${
                    isQueueOpen
                      ? isYouTubeMode
                        ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 shadow-sm"
                        : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                  title="Daftar Putar (Playlist Queue)"
                >
                  <ListMusic className="w-4 h-4" />
                  {playlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] text-[8px] font-bold rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                      {playlist.length}
                    </span>
                  )}
                </button>

                {/* Direct Download button (if available) */}
                {currentTrack.downloadUrl && !isYouTubeMode && (
                  <a
                    href={currentTrack.downloadUrl}
                    download={currentTrack.name}
                    className="btn-icon p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    title={`Download ${currentTrack.name}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {/* Close Button */}
                {onClosePlayer && (
                  <button
                    onClick={onClosePlayer}
                    className="btn-icon btn-icon-close p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Tutup pemutar musik"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Playback Info & Mobile Capability Modal */}
      {isBgInfoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md modal-backdrop-animate">
          <div className="relative w-full max-w-lg rounded-3xl glass-panel bg-white/98 dark:bg-slate-950/95 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden modal-content-animate flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-indigo-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <Smartphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Fitur Putar Latar Belakang</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30">
                      Aktif
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Panduan lengkap memutar musik saat layar HP mati & multitasking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBgInfoOpen(false)}
                className="btn-icon btn-icon-close p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
              {/* Status Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Web MediaSession & Background Audio Siap
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Aplikasi ini otomatis menyinkronkan lagu yang sedang diputar dengan sistem operasi HP Anda (Android Chrome / iOS Safari / Samsung Internet).
                  </p>
                </div>
              </div>

              {/* 4 Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card 1: Lock Screen */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
                    <Lock className="w-4 h-4" />
                    <span>Kontrol Layar Kunci</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Lagu dapat di-pause, di-play, diganti, dan diatur posisi durasinya langsung dari Lock Screen & panel notifikasi HP.
                  </p>
                </div>

                {/* Card 2: Bluetooth & Smartwatch */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                    <Headphones className="w-4 h-4" />
                    <span>TWS & Smartwatch</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mendukung tombol sentuh earphone nirkabel, AirPods, smartwatch, dan Bluetooth mobil untuk mengontrol playlist.
                  </p>
                </div>

                {/* Card 3: Multitasking */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Multitasking Lancar</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Musik tetap berjalan tanpa terputus saat Anda membuka WhatsApp, Instagram, membaca artikel, atau mengunci HP.
                  </p>
                </div>

                {/* Card 4: Screen Wake Lock */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                    <Sun className="w-4 h-4" />
                    <span>Layar Tetap Hidup</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Gunakan fitur Layar Tetap Hidup jika ingin melihat lirik atau visualizer lagu tanpa takut layar HP otomatis mati.
                  </p>
                </div>
              </div>

              {/* Wake Lock Quick Toggle Row */}
              {isWakeLockSupported && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sun className={`w-4 h-4 ${isWakeLockActive ? "text-amber-500 fill-amber-500 animate-spin-slow" : "text-slate-400"}`} />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-xs">
                        Layar Tetap Hidup (Screen Wake Lock)
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {isWakeLockActive ? "Layar tidak akan otomatis mati saat lagu diputar." : "Layar dapat meredup dan tidur secara normal."}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={toggleWakeLock}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm ${
                      isWakeLockActive
                        ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isWakeLockActive ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                💡 Tips: Tambahkan ke Layar Utama (Add to Home Screen) untuk akses instan.
              </p>
              <button
                onClick={() => setIsBgInfoOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-transform"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
