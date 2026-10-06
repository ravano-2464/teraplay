"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Film,
  Music,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Youtube,
  Radio,
  Clock,
  Eye,
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { useI18n } from "@/context/I18nContext";

interface YouTubeCardProps {
  track: TeraBoxFile;
  isCurrentlyPlaying: boolean;
  onPlayAudio: (track: TeraBoxFile) => void;
  onOpenVideo: (track: TeraBoxFile) => void;
  onAddToQueue?: (track: TeraBoxFile) => void;
}

export const YouTubeCard: React.FC<YouTubeCardProps> = ({
  track,
  isCurrentlyPlaying,
  onPlayAudio,
  onOpenVideo,
  onAddToQueue,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [queued, setQueued] = useState(false);

  const videoId = track.youtubeId || "";
  const ytWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ytWatchUrl) {
      navigator.clipboard.writeText(ytWatchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToQueue) {
      onAddToQueue(track);
      setQueued(true);
      setTimeout(() => setQueued(false), 2000);
    }
  };

  return (
    <div
      onClick={() => onPlayAudio(track)}
      className={`group relative rounded-2xl glass-card p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer border transition-all duration-200 overflow-hidden ${
        isCurrentlyPlaying
          ? "border-rose-500 bg-rose-50/80 dark:bg-rose-950/20 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/30"
          : "border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Thumbnail Area */}
      <div className="relative w-full aspect-video rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden mb-2.5 sm:mb-3 border border-slate-200/60 dark:border-white/5 flex items-center justify-center shrink-0">
        {track.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt={track.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <Youtube className="w-8 h-8" />
          </div>
        )}

        {/* Duration badge */}
        {track.formattedDuration && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10 shadow-sm flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-slate-300" />
            <span>{track.formattedDuration}</span>
          </div>
        )}

        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-red-600/90 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1 shadow-sm">
          <Youtube className="w-2.5 h-2.5 text-white" />
          <span>YouTube</span>
        </div>

        {/* Hover overlay for quick play */}
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center gap-2 transition-opacity duration-200 ${
            isCurrentlyPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio(track);
            }}
            className="btn-icon w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 hover:scale-110 active:scale-95 transition-transform"
            title={isCurrentlyPlaying ? t.common.actions : t.youtube.playAudio}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenVideo(track);
            }}
            className="btn-icon w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center border border-white/30 hover:scale-105 active:scale-95 transition-transform"
            title={t.youtube.watchVideo}
          >
            <Film className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <h3
          className={`font-bold text-xs sm:text-sm line-clamp-2 leading-snug transition-colors ${
            isCurrentlyPlaying
              ? "text-rose-600 dark:text-rose-400 font-extrabold"
              : "text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400"
          }`}
          title={track.name}
        >
          {track.name}
        </h3>

        <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 min-w-0">
          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
            {track.artist || track.youtubeChannel || "YouTube Creator"}
          </span>
          {track.views && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium hidden sm:inline">
              {track.views}
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5 min-w-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayAudio(track);
          }}
          className={`btn-icon btn-icon-wiggle flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 min-w-0 ${
            isCurrentlyPlaying
              ? "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 shadow-2xs"
              : "text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200/80 dark:border-rose-500/20 shadow-2xs"
          }`}
          title={isCurrentlyPlaying ? t.youtube.playing : t.youtube.playAudio}
        >
          {isCurrentlyPlaying ? (
            <>
              <Radio className="w-3.5 h-3.5 shrink-0 animate-pulse text-rose-500" />
              <span className="text-[11px] font-bold whitespace-nowrap">{t.youtube.playing}</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="text-[11px] font-bold whitespace-nowrap">Play</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {onAddToQueue && (
            <button
              type="button"
              onClick={handleQueue}
              className="btn-icon btn-icon-bounce-y w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t.youtube.addToQueue}
            >
              {queued ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenVideo(track);
            }}
            className="btn-icon btn-icon-wiggle w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t.youtube.watchVideo}
          >
            <Film className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="btn-icon btn-icon-bounce-y w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t.youtube.copyLink}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {ytWatchUrl && (
            <a
              href={ytWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-icon btn-icon-bounce-x w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t.youtube.openYouTube}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
