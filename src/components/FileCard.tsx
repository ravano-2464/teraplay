"use client";

import React from "react";
import {
  Music,
  Film,
  Image as ImageIcon,
  FileText,
  Archive,
  File,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Radio,
  Clock,
  ExternalLink,
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { CATEGORY_COLORS, formatDuration } from "@/lib/formatters";

interface FileCardProps {
  file: TeraBoxFile;
  isCurrentlyPlayingAudio: boolean;
  onPlayAudio: (file: TeraBoxFile) => void;
  onOpenVideo: (file: TeraBoxFile) => void;
  onOpenFolder?: (path: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isCurrentlyPlayingAudio,
  onPlayAudio,
  onOpenVideo,
  onOpenFolder,
}) => {
  const [copied, setCopied] = React.useState(false);
  const styling = CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other;

  const displayDuration =
    file.formattedDuration ||
    (file.duration ? formatDuration(file.duration) : (file.category === "audio" || file.category === "video" ? "--:--" : ""));

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = file.downloadUrl || file.streamUrl || window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    if (file.isDir && file.path && onOpenFolder) {
      onOpenFolder(file.path);
    } else if (file.category === "audio") {
      onPlayAudio(file);
    } else if (file.category === "video") {
      onOpenVideo(file);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl glass-card p-4 flex flex-col justify-between cursor-pointer border transition-all ${
        isCurrentlyPlayingAudio
          ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10"
          : "border-white/5 hover:border-slate-700"
      }`}
    >
      {/* Top Media Preview / Icon */}
      <div className="relative w-full aspect-video rounded-xl bg-slate-900 overflow-hidden mb-3.5 border border-white/5 flex items-center justify-center">
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`p-4 rounded-2xl ${styling.bg} ${styling.text} border ${styling.border}`}>
            {file.category === "audio" && <Music className="w-8 h-8" />}
            {file.category === "video" && <Film className="w-8 h-8" />}
            {file.category === "image" && <ImageIcon className="w-8 h-8" />}
            {file.category === "document" && <FileText className="w-8 h-8" />}
            {file.category === "archive" && <Archive className="w-8 h-8" />}
            {file.category === "other" && <File className="w-8 h-8" />}
          </div>
        )}

        {/* Play overlay for audio/video */}
        {(file.category === "audio" || file.category === "video") && (
          <div
            className={`absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center transition-opacity ${
              isCurrentlyPlayingAudio ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              {isCurrentlyPlayingAudio ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* Extension Pill */}
        <span
          className={`absolute top-2 left-2 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border backdrop-blur-md ${styling.badge}`}
        >
          {file.extension}
        </span>

        {/* Size Badge */}
        <span className="absolute bottom-2 right-2 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-white border border-white/10 backdrop-blur-md">
          {file.formattedSize}
        </span>
      </div>

      {/* File Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h4 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug">
            {file.name}
          </h4>
        </div>

        {file.artist && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {file.artist} {file.album ? `• ${file.album}` : ""}
          </p>
        )}

        {file.bitrate && (
          <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
            {file.bitrate}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px] font-mono text-slate-400 inline-flex items-center gap-1">
          {displayDuration ? (
            <>
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{displayDuration}</span>
            </>
          ) : (
            <span className="text-slate-500">File</span>
          )}
        </span>

        <div className="flex items-center gap-1.5">
          {(file.category === "video" || file.extension === "mp4") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVideo(file);
              }}
              className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer"
              title="Tonton Video"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Salin direct link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {file.downloadUrl && (
            <a
              href={file.downloadUrl}
              download={file.name}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-300 transition-all font-semibold cursor-pointer"
              title={`Download (${file.formattedSize})`}
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
