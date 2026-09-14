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
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { formatDuration } from "@/lib/formatters";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);

  // Reset position when a new file is opened
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setIsMaximized(false);
  }, [file?.id]);

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    onClose();
  };

  if (!file) return null;

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

  // Dragging handlers with PointerEvents
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    // Don't drag if clicking buttons inside header
    if ((e.target as HTMLElement).closest("button, a, input")) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPos({ x: position.x, y: position.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isMaximized) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setPosition({
      x: startPos.x + deltaX,
      y: startPos.y + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-200 ${
        isDragging ? "select-none cursor-grabbing" : ""
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isMaximized
            ? "none"
            : `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDragging ? "none" : "transform 0.15s ease-out",
        }}
        className={`relative bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ${
          isMaximized
            ? "w-full h-full max-w-none max-h-none rounded-none border-none"
            : "w-full max-w-4xl max-h-[92vh]"
        } ${isDragging ? "shadow-cyan-500/20 border-cyan-400 ring-2 ring-cyan-500/30" : ""}`}
      >
        {/* Draggable Modal Header */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleToggleMaximize}
          className={`flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 ${
            isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"
          }`}
          title={isMaximized ? undefined : "Tahan & drag header ini untuk menggeser jendela video"}
        >
          {/* Left Title & Drag Icon */}
          <div className="flex items-center gap-2.5 truncate min-w-0 pr-2 select-none">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
              <GripHorizontal className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                <span className="truncate">{file.name}</span>
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">{file.formattedSize}</span>
                {displayDuration && (
                  <>
                    <span>•</span>
                    <span>Durasi: {displayDuration}</span>
                  </>
                )}
                <span className="hidden md:inline text-slate-500">• (Geser / Drag window)</span>
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Reset Position (if dragged) */}
            {(position.x !== 0 || position.y !== 0) && !isMaximized && (
              <button
                onClick={handleResetPosition}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Pusatkan kembali jendela video (Reset Posisi)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Maximize / Restore Toggle */}
            <button
              onClick={handleToggleMaximize}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isMaximized ? "Perkecil (Restore)" : "Perbesar (Maximize)"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Direct Download */}
            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                download={file.name}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
                title={`Download ${file.name}`}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-all cursor-pointer ml-1"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 hover:text-rose-400" />
            </button>
          </div>
        </div>

        {/* Video Player Box */}
        <div
          className={`relative flex-1 bg-black flex items-center justify-center ${
            isMaximized
              ? "h-[calc(100vh-80px)]"
              : "min-h-[260px] sm:min-h-[420px] max-h-[72vh]"
          }`}
        >
          <video
            ref={videoRef}
            src={file.streamUrl || file.downloadUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleLoadedMetadata}
            className="w-full h-full object-contain"
          >
            Browser Anda tidak mendukung tag video HTML5.
          </video>
        </div>

        {/* Modal Footer info */}
        <div className="px-4 py-2 bg-slate-950/90 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 select-none">
          <span className="truncate max-w-[280px] sm:max-w-md">
            Path: <code className="text-slate-300 font-mono">{file.path || `/${file.name}`}</code>
          </span>
          <span className="text-cyan-400/90 font-medium">TeraBox Video Stream Ready</span>
        </div>
      </div>
    </div>
  );
};
