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
  Youtube,
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { CATEGORY_COLORS, formatDuration } from "@/lib/formatters";
import { useI18n } from "../context/I18nContext";

interface FileCardProps {
  file: TeraBoxFile;
  isCurrentlyPlayingAudio: boolean;
  onPlayAudio: (file: TeraBoxFile) => void;
  onOpenVideo: (file: TeraBoxFile) => void;
  onPlayYouTube?: (file: TeraBoxFile) => void;
  onOpenFolder?: (path: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  isCurrentlyPlayingAudio,
  onPlayAudio,
  onOpenVideo,
  onPlayYouTube,
  onOpenFolder,
}) => {
  const { t } = useI18n();
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
      className={`group relative rounded-2xl glass-card p-4 flex flex-col justify-between cursor-pointer border transition-all duration-200 ${
        isCurrentlyPlayingAudio
          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
          : "border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Top Media Preview / Icon */}
      <div className="relative w-full aspect-video rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden mb-3.5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center">
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
            className={`absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
              isCurrentlyPlayingAudio ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isCurrentlyPlayingAudio
                  ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40"
                  : "bg-white/90 text-slate-950 hover:scale-110 shadow-lg"
              } transition-transform`}
            >
              {isCurrentlyPlayingAudio ? (
                <Radio className="w-6 h-6 animate-pulse" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* Duration badge overlay */}
        {displayDuration && displayDuration !== "--:--" && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm text-[10px] font-mono font-medium text-slate-200 border border-white/10 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span>{displayDuration}</span>
          </div>
        )}

        {/* Category tag in preview */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md backdrop-blur-md border ${styling.badge}`}>
            {file.extension || file.category}
          </span>
        </div>
      </div>

      {/* Center Details */}
      <div className="mb-3">
        <h3
          className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug"
          title={file.name}
        >
          {file.name}
        </h3>
        {file.artist && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {file.artist} {file.album ? `• ${file.album}` : ""}
          </p>
        )}
      </div>

      {/* Bottom Info & Action Bar */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
        {/* File Size in MB (Key requirement) */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            {file.formattedSize}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {(file.category === "audio" || file.category === "video" || file.extension === "mp4" || file.extension === "mp3") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onPlayYouTube) {
                  onPlayYouTube(file);
                } else {
                  onPlayAudio({
                    ...file,
                    isYoutubeFallback: true,
                    sourceType: "youtube-fallback",
                  });
                }
              }}
              className="btn-icon btn-icon-wiggle p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 shadow-2xs"
              title={t.youtube.playAudio}
            >
              <Youtube className="w-3.5 h-3.5" />
            </button>
          )}

          {(file.category === "video" || file.extension === "mp4") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVideo(file);
              }}
              className="btn-icon btn-icon-wiggle p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-2xs"
              title={t.youtube.watchVideo}
            >
              <Film className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="btn-icon btn-icon-bounce-y p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
            title={copied ? t.common.copied : t.common.copyLink}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {file.downloadUrl && (
            <a
              href={file.downloadUrl}
              download={file.name}
              onClick={(e) => e.stopPropagation()}
              className="btn-icon btn-icon-bounce-y p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-sky-500 hover:text-slate-950 text-slate-600 dark:text-slate-300"
              title={`${t.common.download} ${file.name}`}
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
