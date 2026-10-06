"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  Film,
  Maximize2,
  Minimize2,
  GripHorizontal,
  RotateCcw,
  PictureInPicture2,
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { formatDuration } from "@/lib/formatters";
import { useI18n } from "../context/I18nContext";

interface VideoModalProps {
  file: TeraBoxFile | null;
  onClose: () => void;
  onDurationLoaded?: (fileId: string, duration: number) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  file,
  onClose,
  onDurationLoaded,
}) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [animatingEntry, setAnimatingEntry] = useState(true);
  const [isMaximizingTransition, setIsMaximizingTransition] = useState(false);

  const [ytFallbackTrack, setYtFallbackTrack] = useState<{ id: string; title: string; channel?: string } | null>(
    file?.youtubeId ? { id: file.youtubeId, title: file.youtubeTitle || file.name, channel: file.youtubeChannel } : null
  );
  const [isSearchingFallback, setIsSearchingFallback] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Update fallback info when a new file is opened (preserve user-dragged modal position)
  useEffect(() => {
    setFallbackNotice(null);
    setAnimatingEntry(true);
    if (file?.youtubeId) {
      setYtFallbackTrack({ id: file.youtubeId, title: file.youtubeTitle || file.name, channel: file.youtubeChannel });
    } else {
      setYtFallbackTrack(null);
    }
  }, [file]);

  // Robust global pointer drag listeners for butter-smooth window dragging
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Bound position within viewport so header always remains grabbable
      const maxBoundX = typeof window !== "undefined" ? Math.max(300, window.innerWidth / 2) : 600;
      const maxBoundY = typeof window !== "undefined" ? Math.max(200, window.innerHeight / 2) : 400;

      setPosition({
        x: Math.max(-maxBoundX, Math.min(maxBoundX, startPos.x + deltaX)),
        y: Math.max(-maxBoundY, Math.min(maxBoundY, startPos.y + deltaY)),
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, dragStart, startPos]);

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    onClose();
  };

  if (!file) return null;

  const isYouTubeMode = Boolean(ytFallbackTrack?.id || file.youtubeId || file.isYoutubeFallback);
  const activeYtId = ytFallbackTrack?.id || file.youtubeId;

  const displayDuration =
    file.formattedDuration ||
    (file.duration ? formatDuration(file.duration) : null);

  const handleLoadedMetadata = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    const dur = e.currentTarget.duration;
    if (dur && !isNaN(dur) && isFinite(dur) && dur > 0 && file) {
      onDurationLoaded?.(file.id, dur);
    }
  };

  // Automatically switch to ad-free YouTube when TeraBox stream fails
  const triggerYouTubeFallback = async () => {
    if (isSearchingFallback) return;
    setIsSearchingFallback(true);
    setFallbackNotice("Mencari video di YouTube (Bebas Iklan)...");

    try {
      const res = await fetch(
        `/api/youtube/search?filename=${encodeURIComponent(file.name)}&artist=${encodeURIComponent(
          file.artist || ""
        )}&best=true`
      );
      const data = await res.json();
      if (data.success && data.track?.id) {
        setYtFallbackTrack({
          id: data.track.id,
          title: data.track.title,
          channel: data.track.channel,
        });
        setFallbackNotice("⚡ Beralih otomatis ke YouTube Video (Bebas Iklan)");
        if (data.track.duration) {
          onDurationLoaded?.(file.id, data.track.duration);
        }
      } else {
        setFallbackNotice("Video tidak ditemukan di YouTube.");
      }
    } catch {
      setFallbackNotice("Gagal menghubungkan ke YouTube.");
    } finally {
      setIsSearchingFallback(false);
    }
  };

  const handleVideoError = () => {
    console.warn("TeraBox Video Stream failed in modal, triggering YouTube fallback...");
    triggerYouTubeFallback();
  };

  // Start drag on header
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    // Don't drag if clicking buttons, links, or inputs
    if ((e.target as HTMLElement).closest("button, a, input, select")) return;

    setAnimatingEntry(false);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPos({ x: position.x, y: position.y });
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimatingEntry(false);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleMaximize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAnimatingEntry(false);
    setIsMaximizingTransition(true);
    setTimeout(() => setIsMaximizingTransition(false), 350);

    setIsMaximized((prev) => {
      const next = !prev;
      if (next) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleTogglePiP = async () => {
    if (typeof document === "undefined") return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn("PiP failed in modal:", err);
    }
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-md modal-backdrop-animate ${
        isDragging ? "select-none cursor-grabbing" : ""
      }`}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isMaximized
            ? "translate3d(0px, 0px, 0)"
            : `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDragging
            ? "none"
            : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s cubic-bezier(0.16, 1, 0.3, 1), height 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: isDragging ? "transform" : "transform, width, height",
        }}
        className={`relative bg-white dark:bg-slate-950/95 border ${
          isYouTubeMode
            ? "border-rose-400 dark:border-rose-500/40 shadow-[0_25px_70px_rgba(244,63,94,0.25)]"
            : "border-slate-200 dark:border-cyan-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.9)]"
        } overflow-hidden flex flex-col ${
          animatingEntry ? "modal-content-animate" : ""
        } ${
          isMaximizingTransition ? "modal-maximize-spring" : ""
        } ${
          isMaximized
            ? "w-full h-full sm:w-[98vw] sm:h-[96vh] max-w-none max-h-none rounded-none sm:rounded-2xl border-transparent shadow-2xl"
            : "w-full max-w-4xl h-[78vh] sm:h-[84vh] max-h-[92vh] rounded-3xl"
        } ${isDragging ? "ring-2 ring-cyan-500/60 shadow-2xl cursor-grabbing select-none" : ""}`}
        onAnimationEnd={() => setAnimatingEntry(false)}
      >
        {/* Draggable Modal Header */}
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={() => handleToggleMaximize()}
          style={{ touchAction: "none" }}
          className={`flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r select-none transition-colors ${
            isYouTubeMode
              ? "from-slate-100 via-rose-50 to-slate-100 dark:from-slate-950 dark:via-rose-950/40 dark:to-slate-950"
              : "from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
          } ${isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
          title={isMaximized ? "Klik 2x untuk memperkecil" : "Tahan & geser (drag) header untuk memindahkan posisi • Klik 2x untuk Maximize"}
        >
          {/* Left Title & Drag Icon */}
          <div className="flex items-center gap-2.5 truncate min-w-0 pr-2 pointer-events-none">
            <div className={`p-1.5 rounded-xl border shrink-0 transition-transform ${
              isDragging ? "scale-125 rotate-6" : "hover:scale-110"
            } ${
              isYouTubeMode
                ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30"
                : "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/30"
            }`}>
              <GripHorizontal className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate flex items-center gap-2">
                <span className="truncate">{ytFallbackTrack?.title || file.name}</span>
                {isYouTubeMode && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                    {t.videoModal.adFreeVideo}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className={isYouTubeMode ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-cyan-600 dark:text-cyan-400 font-semibold"}>
                  {isYouTubeMode ? ytFallbackTrack?.channel || "YouTube Stream" : file.formattedSize}
                </span>
                {displayDuration && (
                  <>
                    <span>•</span>
                    <span>{t.common.duration}: {displayDuration}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
            {/* Toggle YouTube Fallback button */}
            {!isYouTubeMode && (
              <button
                type="button"
                onClick={triggerYouTubeFallback}
                disabled={isSearchingFallback}
                className="btn-icon btn-icon-wiggle flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-500/30 shadow-sm"
                title={t.nav.youtubeMode}
              >
                <Film className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span className="hidden sm:inline">
                  {isSearchingFallback ? "..." : "YouTube"}
                </span>
              </button>
            )}

            {/* Reset Position (if dragged) */}
            {(position.x !== 0 || position.y !== 0) && !isMaximized && (
              <button
                type="button"
                onClick={handleResetPosition}
                className="btn-icon btn-icon-spin p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                title="Reset Posisi ke Tengah"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Picture-in-Picture Button */}
            {!isYouTubeMode && (
              <button
                type="button"
                onClick={handleTogglePiP}
                className="btn-icon p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                title={t.player.pipButton || "Picture-in-Picture (Layar Melayang)"}
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Maximize / Restore Toggle */}
            <button
              type="button"
              onClick={handleToggleMaximize}
              className="btn-icon btn-icon-spin p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-transform"
              title={isMaximized ? "Perkecil (Restore)" : "Perbesar (Maximize)"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Direct Download / YouTube Link */}
            {file.downloadUrl && !isYouTubeMode && (
              <a
                href={file.downloadUrl}
                download={file.name}
                className="btn-icon btn-icon-bounce-y flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-200 dark:border-cyan-500/30"
                title={`${t.common.download} ${file.name}`}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.common.download}</span>
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="btn-icon btn-icon-close p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-white hover:bg-rose-50 dark:hover:bg-rose-500/20 ml-1"
              title={t.videoModal.close}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400" />
            </button>
          </div>
        </div>

        {/* Notice Banner if Fallback is Active */}
        {fallbackNotice && (
          <div className="px-4 py-1.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{fallbackNotice}</span>
            {isYouTubeMode && (
              <button
                type="button"
                onClick={() => {
                  setYtFallbackTrack(null);
                  setFallbackNotice(null);
                }}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Coba TeraBox Stream
              </button>
            )}
          </div>
        )}

        {/* Video Player Box */}
        <div
          className="relative flex-1 bg-black flex items-center justify-center w-full transition-all duration-300 overflow-hidden min-h-0"
        >
          {isYouTubeMode && activeYtId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeYtId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.origin : ""
              )}&iv_load_policy=3&modestbranding=1&rel=0&playsinline=1`}
              title={ytFallbackTrack?.title || file.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0 transition-all duration-300"
            />
          ) : (
            <video
              ref={videoRef}
              src={file.streamUrl || file.downloadUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleLoadedMetadata}
              onError={handleVideoError}
              className="w-full h-full object-contain transition-all duration-300"
            >
              Browser Anda tidak mendukung tag video HTML5.
            </video>
          )}
        </div>

        {/* Modal Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 select-none">
          <span className="truncate max-w-[280px] sm:max-w-md">
            {isYouTubeMode ? (
              <>Lagu YouTube: <span className="text-slate-900 dark:text-white font-medium">{ytFallbackTrack?.title || file.name}</span></>
            ) : (
              <>Path: <code className="text-slate-700 dark:text-slate-300 font-mono">{file.path || `/${file.name}`}</code></>
            )}
          </span>
          <span className={isYouTubeMode ? "text-rose-600 dark:text-rose-400 font-medium" : "text-cyan-600 dark:text-cyan-400/90 font-medium"}>
            {isYouTubeMode ? "⚡ 100% Ad-Free YouTube Playback" : "TeraBox Video Stream Ready"}
          </span>
        </div>
      </div>
    </div>
  );
};
