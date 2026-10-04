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
} from "lucide-react";
import { AudioTrack, PlaybackMode } from "@/types/terabox";
import { formatDuration } from "@/lib/formatters";
import { AudioVisualizer } from "./AudioVisualizer";

interface AudioPlayerBarProps {
  playlist: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  ndusCookie?: string;
  cookieStatus?: "none" | "checking" | "valid" | "expired" | "error";
  onPlayTrack: (track: AudioTrack) => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onClosePlayer?: () => void;
  onOpenCookieModal?: () => void;
  onDurationLoaded?: (trackId: string, duration: number) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  playlist,
  currentTrack,
  isPlaying,
  ndusCookie = "",
  cookieStatus = "none",
  onPlayTrack,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onClosePlayer,
  onOpenCookieModal,
  onDurationLoaded,
}) => {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("repeat-all");
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
  const [beatHeights, setBeatHeights] = useState<number[]>([4, 8, 5]);

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

  // Real-time animation loop for Album Equalizer Bars (following musical rhythm)
  useEffect(() => {
    let animFrame: number;
    const startTime = performance.now();

    const animateBeats = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      if (isPlaying && !isBuffering && !hasError) {
        // 128 BPM beat calculation
        const beatTime = elapsed * 2.133;
        const kick = Math.pow(Math.max(0, Math.sin(beatTime * Math.PI)), 4);
        const snare = Math.pow(Math.max(0, Math.sin((beatTime - 0.5) * Math.PI)), 5);
        const hihat = Math.pow(Math.max(0, Math.sin(beatTime * 4 * Math.PI)), 2);

        const h1 = Math.max(3, (kick * 0.75 + Math.sin(elapsed * 5) * 0.15 + 0.1) * 16);
        const h2 = Math.max(3, (snare * 0.7 + Math.cos(elapsed * 7) * 0.2 + 0.1) * 20);
        const h3 = Math.max(3, (hihat * 0.65 + Math.sin(elapsed * 9) * 0.25 + 0.1) * 15);

        setBeatHeights([h1, h2, h3]);
      } else {
        setBeatHeights((prev) => [
          Math.max(3, prev[0] * 0.8),
          Math.max(3, prev[1] * 0.8),
          Math.max(3, prev[2] * 0.8),
        ]);
      }

      animFrame = requestAnimationFrame(animateBeats);
    };

    animFrame = requestAnimationFrame(animateBeats);
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, isBuffering, hasError]);

  const handleVideoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input")) return;
    setIsVideoDragging(true);
    setVideoDragStart({ x: e.clientX, y: e.clientY });
    setVideoStartPos({ x: videoPos.x, y: videoPos.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleVideoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVideoDragging) return;
    setVideoPos({
      x: videoStartPos.x + (e.clientX - videoDragStart.x),
      y: videoStartPos.y + (e.clientY - videoDragStart.y),
    });
  };

  const handleVideoPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isVideoDragging) return;
    setIsVideoDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
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

      // Apply initial volume & unMute
      const targetVol = isMuted ? 0 : Math.round(volume * 100);
      sendYtCommand("setVolume", [targetVol]);
      if (isMuted) {
        sendYtCommand("mute");
      } else {
        sendYtCommand("unMute");
      }

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
  }, [isPlaying, isMuted, volume, playbackRate, sendYtCommand]);

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
    const targetVol = isMuted ? 0 : Math.round(volume * 100);
    sendYtCommand("setVolume", [targetVol]);
    if (isMuted) {
      sendYtCommand("mute");
    } else {
      sendYtCommand("unMute");
    }
  }, [volume, isMuted, isYouTubeMode, sendYtCommand]);

  // Sync YouTube playback rate
  useEffect(() => {
    if (!isYouTubeMode) return;
    sendYtCommand("setPlaybackRate", [playbackRate]);
  }, [playbackRate, isYouTubeMode, sendYtCommand]);

  // YouTube IFrame Message Listener for time updates & state events
  useEffect(() => {
    if (!isYouTubeMode) return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let msgData = event.data;
        if (typeof msgData === "string" && msgData.startsWith("{")) {
          msgData = JSON.parse(msgData);
        }

        if (msgData?.event === "onReady") {
          if (isPlaying) {
            sendYtCommand("playVideo");
          }
          sendYtCommand("unMute");
          sendYtCommand("setVolume", [isMuted ? 0 : Math.round(volume * 100)]);
          setIsBuffering(false);
          setHasError(false);
        }

        if (msgData?.event === "infoDelivery" && msgData?.info) {
          const info = msgData.info;
          if (typeof info.currentTime === "number" && !isNaN(info.currentTime)) {
            setCurrentTime(info.currentTime);
          }
          if (typeof info.duration === "number" && info.duration > 0 && !isNaN(info.duration)) {
            setDuration(info.duration);
            if (currentTrack) {
              onDurationLoaded?.(currentTrack.id, info.duration);
            }
          }
          if (info.playerState === 0) {
            // Ended
            handleEnded();
          } else if (info.playerState === 1) {
            // Playing
            setIsBuffering(false);
            setHasError(false);
          } else if (info.playerState === 3) {
            // Buffering
            setIsBuffering(true);
          }
        } else if (msgData?.event === "onStateChange") {
          if (msgData.data === 0) {
            handleEnded();
          } else if (msgData.data === 1) {
            setIsBuffering(false);
            setHasError(false);
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
  }, [isYouTubeMode, currentTrack, isPlaying, isMuted, volume, onDurationLoaded, sendYtCommand]);

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
    mediaRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, isYouTubeMode]);

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

  const handleEnded = () => {
    if (playbackMode === "repeat-one") {
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
  };

  const togglePlaybackMode = () => {
    const modes: PlaybackMode[] = ["order", "repeat-all", "repeat-one", "shuffle"];
    const nextIdx = (modes.indexOf(playbackMode) + 1) % modes.length;
    setPlaybackMode(modes[nextIdx]);
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

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const activeTitle = isYouTubeMode && ytTrack?.title ? ytTrack.title : currentTrack.name;
  const activeArtist = isYouTubeMode && ytTrack?.channel ? ytTrack.channel : currentTrack.artist || "TeraBox Music";
  const activeThumbnail = (isYouTubeMode && ytTrack?.thumbnailUrl) || currentTrack.thumbnailUrl;

  return (
    <>
      {/* Draggable Mini Video Floating Window (Unified container for both TeraBox MP4 and YouTube Video) */}
      <div
        style={{
          transform: `translate3d(${videoPos.x}px, ${videoPos.y}px, 0)`,
          transition: isVideoDragging ? "none" : "transform 0.15s ease-out",
        }}
        className={
          showVideoPreview && isVideoFormat
            ? `fixed bottom-24 right-4 z-50 ${
                videoSize === "large" ? "w-80 sm:w-[480px]" : "w-72 sm:w-80"
              } rounded-2xl border ${
                isYouTubeMode
                  ? "border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]"
                  : "border-emerald-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
              } bg-slate-950/95 backdrop-blur-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
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
            onPointerMove={handleVideoPointerMove}
            onPointerUp={handleVideoPointerUp}
            className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r ${
              isYouTubeMode
                ? "from-slate-900 via-rose-950/40 to-slate-900"
                : "from-slate-900 via-slate-800 to-slate-900"
            } border-b border-white/10 cursor-grab active:cursor-grabbing select-none`}
            title="Tahan & geser untuk memindahkan video ke mana saja"
          >
            <div className="flex items-center gap-1.5 truncate min-w-0 pr-2">
              <GripHorizontal
                className={`w-3.5 h-3.5 ${isYouTubeMode ? "text-rose-400" : "text-emerald-400"} shrink-0`}
              />
              <span className="text-[11px] font-bold text-white truncate">
                {activeTitle}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setVideoSize(videoSize === "large" ? "normal" : "large")}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={videoSize === "large" ? "Perkecil ukuran" : "Perbesar ukuran"}
              >
                {videoSize === "large" ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              {(videoPos.x !== 0 || videoPos.y !== 0) && (
                <button
                  onClick={() => setVideoPos({ x: 0, y: 0 })}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reset posisi"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowVideoPreview(false)}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
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
              ref={mediaRef}
              preload="metadata"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleDurationChange}
              onCanPlay={handleCanPlay}
              onWaiting={handleWaiting}
              onPlaying={handlePlaying}
              onError={handleError}
              onEnded={handleEnded}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Hidden HTML5 Video Player element when not in mini-video and not in YouTube mode */}
      {!isYouTubeMode && !showVideoPreview && (
        <video
          ref={mediaRef}
          preload="metadata"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onCanPlay={handleCanPlay}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onError={handleError}
          onEnded={handleEnded}
          className="hidden"
        />
      )}

      {/* Main Floating Deck */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-2 sm:px-4 pb-2 sm:pb-3 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          {/* Fallback & Notification Drawer if Error Occurred */}
          {hasError && (
            <div className="mb-2 p-3.5 rounded-2xl glass-panel bg-rose-950/90 border border-rose-500/40 shadow-2xl animate-in slide-in-from-bottom-3 duration-200 text-xs text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-bold text-white text-xs">
                    {errorMessage || "Streaming media TeraBox gagal dimuat."}
                  </p>
                  <p className="text-[11px] text-rose-300 mt-0.5">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold shadow transition-all cursor-pointer text-xs"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>{isSearchingFallback ? "Mencari di YouTube..." : "Putar via YouTube Bebas Iklan"}</span>
                </button>
                {(!ndusCookie || cookieStatus === "expired") && onOpenCookieModal && (
                  <button
                    onClick={onOpenCookieModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow transition-all cursor-pointer text-xs"
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
            <div className="mb-2 p-4 rounded-2xl glass-panel bg-slate-950/95 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-100">
                    Active Playlist Queue ({playlist.length} Tracks)
                  </h3>
                </div>
                <button
                  onClick={() => setIsQueueOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {playlist.map((track, idx) => {
                  const isCurrent = track.id === currentTrack.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => onPlayTrack(track)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                        isCurrent
                          ? isYouTubeMode
                            ? "bg-rose-500/20 border-rose-500/40 text-white font-bold"
                            : "bg-emerald-500/20 border-emerald-500/40 text-white font-bold"
                          : "bg-slate-900/60 border-white/5 hover:bg-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-mono text-[10px] text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="truncate font-semibold">{track.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {track.artist || "TeraBox Music"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">
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
            className={`relative rounded-2xl glass-panel bg-slate-950/95 border ${
              isYouTubeMode
                ? "border-rose-500/40 shadow-[0_10px_40px_rgba(244,63,94,0.25)]"
                : "border-emerald-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
            } backdrop-blur-2xl px-3 sm:px-5 py-2.5 sm:py-3 text-slate-200 transition-colors duration-300`}
          >
            {/* Top Slim Progress Bar Indicator */}
            <div className="absolute top-0 left-4 right-4 h-1 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  isYouTubeMode
                    ? "bg-gradient-to-r from-rose-500 via-red-400 to-amber-400"
                    : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400"
                } transition-all duration-150`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-6 pt-1">
              {/* Left Track Info */}
              <div className="flex items-center gap-3 min-w-0 max-w-[240px] sm:max-w-[320px]">
                {/* Album Cover / Disc with Real-time Reactive Equalizer */}
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/10 shadow-md">
                  {activeThumbnail ? (
                    <img
                      src={activeThumbnail}
                      alt={activeTitle}
                      className={`w-full h-full object-cover ${isPlaying ? "scale-105" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-slate-900 text-emerald-400">
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

                {/* Name, Artist, Source & Badge */}
                <div className="min-w-0">
                  <h4
                    className={`font-bold text-xs sm:text-sm text-white truncate ${
                      isYouTubeMode ? "hover:text-rose-400" : "hover:text-emerald-400"
                    } transition-colors`}
                  >
                    {activeTitle}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                    <span className="truncate max-w-[120px] font-medium text-slate-300">
                      {activeArtist}
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
                    {isBuffering ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buffering...
                      </span>
                    ) : isYouTubeMode ? (
                      <span className="flex items-center gap-1 font-semibold text-rose-400 text-[10px] bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30">
                        <ShieldCheck className="w-2.5 h-2.5 text-rose-400" /> YouTube Bebas Iklan
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" /> TeraBox Live
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center Controls & Seekbar */}
              <div className="flex flex-col items-center flex-1 max-w-xl">
                {/* Control Buttons */}
                <div className="flex items-center gap-2 sm:gap-4 mb-1">
                  {/* Playback Mode */}
                  <button
                    onClick={togglePlaybackMode}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all text-xs cursor-pointer"
                    title={`Playback Mode: ${playbackMode}`}
                  >
                    {playbackMode === "repeat-one" ? (
                      <Repeat1 className={`w-4 h-4 ${isYouTubeMode ? "text-rose-400" : "text-emerald-400"}`} />
                    ) : playbackMode === "repeat-all" ? (
                      <Repeat className={`w-4 h-4 ${isYouTubeMode ? "text-rose-400" : "text-emerald-400"}`} />
                    ) : playbackMode === "shuffle" ? (
                      <Shuffle className={`w-4 h-4 ${isYouTubeMode ? "text-rose-400" : "text-emerald-400"}`} />
                    ) : (
                      <Repeat className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {/* Previous Track */}
                  <button
                    onClick={onPrevTrack}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
                    title="Track Sebelumnya"
                  >
                    <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </button>

                  {/* Play / Pause Primary */}
                  <button
                    onClick={onTogglePlay}
                    className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full ${
                      isYouTubeMode
                        ? "bg-gradient-to-tr from-rose-500 to-red-500 shadow-rose-500/30 text-white"
                        : "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30 text-slate-950"
                    } font-bold shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                    title={isPlaying ? "Jeda (Pause)" : "Putar (Play)"}
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
                    className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
                    title="Track Berikutnya"
                  >
                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </button>

                  {/* Speed toggle */}
                  <button
                    onClick={cycleSpeed}
                    className={`px-2 py-1 rounded-lg text-slate-400 ${
                      isYouTubeMode ? "hover:text-rose-300" : "hover:text-emerald-300"
                    } hover:bg-slate-800/80 font-mono text-[10px] font-bold border border-slate-700/60 cursor-pointer`}
                    title="Kecepatan Pemutaran (Speed)"
                  >
                    {playbackRate}x
                  </button>
                </div>

                {/* Seekbar and Timers */}
                <div className="w-full flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="w-9 text-right text-slate-300">{formatDuration(currentTime)}</span>
                  <div className="relative flex-1 group flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${
                        isYouTubeMode ? "accent-rose-400" : "accent-emerald-400"
                      } focus:outline-none`}
                    />
                  </div>
                  <span className="w-9">{duration > 0 ? formatDuration(duration) : "--:--"}</span>
                </div>
              </div>

              {/* Right Tools: Switcher, Visualizer, Volume, Video, Queue */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Switch Mode Button */}
                {isYouTubeMode ? (
                  <button
                    onClick={handleSwitchToTeraBox}
                    className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 text-[11px] border border-slate-700/60 transition-colors cursor-pointer"
                    title="Coba beralih ke stream TeraBox"
                  >
                    <Radio className="w-3 h-3" />
                    <span>Mode TeraBox</span>
                  </button>
                ) : (
                  <button
                    onClick={triggerYouTubeFallback}
                    disabled={isSearchingFallback}
                    className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-[11px] border border-slate-700/60 transition-colors cursor-pointer"
                    title="Putar versi YouTube Bebas Iklan"
                  >
                    <Youtube className="w-3 h-3 text-rose-400" />
                    <span>{isSearchingFallback ? "Mencari..." : "Mode YouTube"}</span>
                  </button>
                )}

                {/* High-Energy Rhythm Visualizer in deck */}
                <div className="hidden lg:block w-28 xl:w-32 h-8 shrink-0">
                  <AudioVisualizer
                    isPlaying={isPlaying && !isBuffering && !hasError}
                    audioElement={mediaRef.current}
                    barCount={18}
                    height={30}
                    theme={isYouTubeMode ? "rose" : "emerald"}
                    showPeaks={true}
                  />
                </div>

                {/* Volume Slider */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
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
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className={`w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer ${
                      isYouTubeMode ? "accent-rose-400" : "accent-emerald-400"
                    }`}
                  />
                </div>

                {/* Video Preview Toggle Button */}
                {isVideoFormat && (
                  <button
                    onClick={() => setShowVideoPreview(!showVideoPreview)}
                    className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border cursor-pointer ${
                      showVideoPreview
                        ? isYouTubeMode
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                    }`}
                    title={showVideoPreview ? "Sembunyikan Video" : "Tampilkan Video (Mini Player Bebas Iklan)"}
                  >
                    <Film className={`w-4 h-4 ${isYouTubeMode ? "text-rose-400" : "text-cyan-400"}`} />
                    <span className="hidden sm:inline font-semibold">Video</span>
                  </button>
                )}

                {/* Playlist Queue Button */}
                <button
                  onClick={() => setIsQueueOpen(!isQueueOpen)}
                  className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border cursor-pointer ${
                    isQueueOpen
                      ? isYouTubeMode
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                  }`}
                  title="Daftar Putar (Playlist Queue)"
                >
                  <ListMusic className="w-4 h-4" />
                  <span className="hidden sm:inline font-semibold">{playlist.length}</span>
                </button>

                {/* Direct Download button (if available) */}
                {currentTrack.downloadUrl && !isYouTubeMode && (
                  <a
                    href={currentTrack.downloadUrl}
                    download={currentTrack.name}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/60 transition-all cursor-pointer"
                    title={`Download ${currentTrack.name}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {/* Close Button */}
                {onClosePlayer && (
                  <button
                    onClick={onClosePlayer}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
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
    </>
  );
};
