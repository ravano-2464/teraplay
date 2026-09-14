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

  // Reset video preview position when changing track
  useEffect(() => {
    setVideoPos({ x: 0, y: 0 });
  }, [currentTrack?.id]);

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
    currentTrack?.extension === "mp4" ||
    currentTrack?.category === "video" ||
    currentTrack?.name.endsWith(".mp4");

  // Safe play helper preventing AbortError and uncaught exceptions
  const safePlay = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) return;

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
        setHasError(true);
        setErrorMessage("Gagal memutar media stream TeraBox. Silakan coba klik tombol play kembali.");
      }
      setIsBuffering(false);
    } finally {
      playPromiseRef.current = null;
    }
  }, []);

  // Safe pause helper
  const safePause = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) return;

    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      media.pause();
      setIsBuffering(false);
    } catch {
      // ignore
    }
  }, []);

  // Sync media source and playback state (Strictly On-Demand lazy streaming)
  useEffect(() => {
    if (!mediaRef.current || !currentTrack) return;

    const media = mediaRef.current;
    setHasError(false);
    setErrorMessage(null);

    const targetUrl = currentTrack.streamUrl || currentTrack.downloadUrl || "";

    if (!targetUrl) {
      setHasError(true);
      setErrorMessage("File ini tidak memiliki URL streaming langsung. Pastikan file tersedia.");
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
        // Track set/selected while paused: do not trigger heavy stream download
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
  }, [currentTrack?.id, currentTrack?.streamUrl, isPlaying, safePlay, safePause]);

  // Volume & Speed effects
  useEffect(() => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!mediaRef.current) return;
    mediaRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Reset time and duration when switching track
  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentTrack?.duration || 0);
  }, [currentTrack?.id]);

  // Media Event Handlers
  const updateMediaDuration = useCallback(() => {
    if (!mediaRef.current) return;
    const realDur = mediaRef.current.duration;
    if (realDur && !isNaN(realDur) && isFinite(realDur) && realDur > 0) {
      setDuration(realDur);
      if (currentTrack) {
        onDurationLoaded?.(currentTrack.id, realDur);
      }
    }
  }, [currentTrack, onDurationLoaded]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
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
    updateMediaDuration();
    setIsBuffering(false);
    setHasError(false);
  };

  const handleDurationChange = () => {
    updateMediaDuration();
  };

  const handleCanPlay = () => {
    updateMediaDuration();
    setIsBuffering(false);
    setHasError(false);
  };

  const handleWaiting = () => {
    if (isPlaying) {
      setIsBuffering(true);
    }
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsBuffering(false);
    const media = mediaRef.current;
    const mediaErr = media?.error;

    let msg = "Gagal memutar stream TeraBox. Periksa koneksi atau coba lagi.";
    if (mediaErr) {
      if (mediaErr.code === 4) {
        msg = "Format media tidak didukung browser atau link stream terputus.";
      } else if (mediaErr.code === 2) {
        msg = "Koneksi jaringan terputus saat streaming media.";
      } else if (mediaErr.code === 3) {
        msg = "Terjadi kendala saat decoding media.";
      }
    }

    setHasError(true);
    setErrorMessage(msg);
  };

  const handleRetry = () => {
    if (!mediaRef.current || !currentTrack) return;
    const streamTarget = currentTrack.streamUrl || currentTrack.downloadUrl;
    if (!streamTarget) {
      setHasError(true);
      setErrorMessage("Tidak ada streaming URL.");
      return;
    }
    setHasError(false);
    setErrorMessage(null);
    setIsBuffering(true);
    mediaRef.current.src = streamTarget;
    mediaRef.current.load();
    safePlay();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
    }
  };

  const handleEnded = () => {
    if (playbackMode === "repeat-one") {
      if (mediaRef.current) {
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

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Draggable Mini Video Floating Window */}
      <div
        style={{
          transform: `translate3d(${videoPos.x}px, ${videoPos.y}px, 0)`,
          transition: isVideoDragging ? "none" : "transform 0.15s ease-out",
        }}
        className={
          showVideoPreview && isVideoFormat
            ? `fixed bottom-24 right-4 z-50 ${
                videoSize === "large" ? "w-80 sm:w-[480px]" : "w-72 sm:w-80"
              } rounded-2xl border border-emerald-500/50 bg-slate-950/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ${
                isVideoDragging ? "ring-2 ring-emerald-400 shadow-emerald-500/30 select-none cursor-grabbing" : ""
              }`
            : "hidden"
        }
      >
        {/* Mini Window Drag Header */}
        <div
          onPointerDown={handleVideoPointerDown}
          onPointerMove={handleVideoPointerMove}
          onPointerUp={handleVideoPointerUp}
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
          title="Tahan & geser untuk memindahkan video ke mana saja"
        >
          <div className="flex items-center gap-1.5 truncate min-w-0 pr-2">
            <GripHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-white truncate">
              {currentTrack.name}
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

        {/* Video Canvas */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
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
        </div>
      </div>

      {/* Main Floating Deck */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-2 sm:px-4 pb-2 sm:pb-3 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          {/* Error Notification Alert Drawer */}
          {hasError && (
            <div className="mb-2 p-3.5 rounded-2xl glass-panel bg-rose-950/90 border border-rose-500/40 shadow-2xl animate-in slide-in-from-bottom-3 duration-200 text-xs text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-bold text-white text-xs">{errorMessage || "Streaming media TeraBox gagal dimuat."}</p>
                  <p className="text-[11px] text-rose-300 mt-0.5">
                    {cookieStatus === "expired"
                      ? "Cookie ndus Anda sudah KEDALUWARSA (Session Expired). Silakan perbarui cookie ndus terbaru dari terabox.com."
                      : !ndusCookie
                      ? "Link private TeraBox (dm.terabox.com) memerlukan Cookie ndus untuk akses direct stream."
                      : "Stream mengalami gangguan buffer atau CDN TeraBox sedang sibuk. Silakan klik Coba Lagi."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {(!ndusCookie || cookieStatus === "expired") && onOpenCookieModal && (
                  <button
                    onClick={onOpenCookieModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow transition-all cursor-pointer text-xs"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{cookieStatus === "expired" ? "Perbarui Cookie ndus" : "Set Cookie ndus"}</span>
                  </button>
                )}
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Coba Lagi</span>
                </button>
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

              <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {playlist.map((track, idx) => {
                  const isCurrent = track.id === currentTrack.id;
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => onPlayTrack(track)}
                      className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-xs ${
                        isCurrent
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-white font-medium shadow-sm"
                          : "hover:bg-slate-900 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate min-w-0 pr-2">
                        <span className="w-5 text-center text-slate-400 text-[11px] font-mono">
                          {isCurrent && isPlaying ? (
                            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse inline" />
                          ) : (
                            idx + 1
                          )}
                        </span>
                        <div className="truncate">
                          <p className="truncate text-slate-100 font-medium">
                            {track.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {track.artist || "TeraBox Music"} • {track.formattedSize}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] shrink-0">
                        <span>{track.formattedDuration || formatDuration(track.duration || 180)}</span>
                        {track.downloadUrl && (
                          <a
                            href={track.downloadUrl}
                            download={track.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                            title="Download track"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Player Container */}
          <div className="relative rounded-2xl glass-panel bg-slate-950/95 border border-emerald-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl px-3 sm:px-5 py-2.5 sm:py-3 text-slate-200">
            {/* Top Slim Progress Bar Indicator */}
            <div className="absolute top-0 left-4 right-4 h-1 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-6 pt-1">
              {/* Left Track Info */}
              <div className="flex items-center gap-3 min-w-0 max-w-[240px] sm:max-w-[320px]">
                {/* Album Cover / Disc */}
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/10 shadow-md">
                  {currentTrack.thumbnailUrl ? (
                    <img
                      src={currentTrack.thumbnailUrl}
                      alt={currentTrack.name}
                      className={`w-full h-full object-cover ${isPlaying ? "scale-105" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-slate-900 text-emerald-400">
                      <Music className="w-5 h-5" />
                    </div>
                  )}
                  {isPlaying && !hasError && (
                    <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="flex items-end gap-[2px] h-4">
                        <span className="equalizer-bar" />
                        <span className="equalizer-bar" />
                        <span className="equalizer-bar" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Name, Artist, Source & Size badge */}
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-white truncate hover:text-emerald-400 transition-colors">
                    {currentTrack.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                    <span className="truncate max-w-[120px] font-medium text-slate-300">
                      {currentTrack.artist || "TeraBox Music"}
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
                    {isBuffering ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buffering...
                      </span>
                    ) : hasError ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                        <AlertTriangle className="w-2.5 h-2.5" /> Error Stream
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
                      <Repeat1 className="w-4 h-4 text-emerald-400" />
                    ) : playbackMode === "repeat-all" ? (
                      <Repeat className="w-4 h-4 text-emerald-400" />
                    ) : playbackMode === "shuffle" ? (
                      <Shuffle className="w-4 h-4 text-emerald-400" />
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
                    className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title={isPlaying ? "Jeda (Pause)" : "Putar (Play)"}
                  >
                    {isBuffering ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
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
                    className="px-2 py-1 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80 font-mono text-[10px] font-bold border border-slate-700/60 cursor-pointer"
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
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                    />
                  </div>
                  <span className="w-9">{duration > 0 ? formatDuration(duration) : "--:--"}</span>
                </div>
              </div>

              {/* Right Tools: Visualizer, Volume, Queue */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mini Visualizer in deck */}
                <div className="hidden lg:block w-24">
                  <AudioVisualizer isPlaying={isPlaying && !isBuffering && !hasError} barCount={16} height={26} theme="emerald" />
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
                    className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                {/* Video Preview Toggle Button for MP4s */}
                {isVideoFormat && (
                  <button
                    onClick={() => setShowVideoPreview(!showVideoPreview)}
                    className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border cursor-pointer ${
                      showVideoPreview
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                    }`}
                    title={showVideoPreview ? "Sembunyikan Video" : "Tampilkan Video (Mini Player)"}
                  >
                    <Film className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline font-semibold">Video</span>
                  </button>
                )}

                {/* Playlist Queue Button */}
                <button
                  onClick={() => setIsQueueOpen(!isQueueOpen)}
                  className={`p-2 rounded-xl transition-all text-xs flex items-center gap-1.5 border cursor-pointer ${
                    isQueueOpen
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60"
                  }`}
                  title="Daftar Putar (Playlist Queue)"
                >
                  <ListMusic className="w-4 h-4" />
                  <span className="hidden sm:inline font-semibold">{playlist.length}</span>
                </button>

                {/* Direct Download button */}
                {currentTrack.downloadUrl && (
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
