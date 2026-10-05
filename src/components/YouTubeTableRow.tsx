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
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { useI18n } from "@/context/I18nContext";

interface YouTubeTableRowProps {
  track: TeraBoxFile;
  index: number;
  isCurrentlyPlaying: boolean;
  onPlayAudio: (track: TeraBoxFile) => void;
  onOpenVideo: (track: TeraBoxFile) => void;
  onAddToQueue?: (track: TeraBoxFile) => void;
}

export const YouTubeTableRow: React.FC<YouTubeTableRowProps> = ({
  track,
  index,
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
    <tr
      onClick={() => onPlayAudio(track)}
      className={`group border-b border-slate-200/60 dark:border-white/5 transition-colors cursor-pointer text-xs ${
        isCurrentlyPlaying
          ? "bg-rose-50/90 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100"
          : "hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-800 dark:text-slate-200"
      }`}
    >
      {/* Index / Play indicator */}
      <td className="py-3 pl-4 pr-2 w-12 text-center">
        {isCurrentlyPlaying ? (
          <div className="flex items-center justify-center text-rose-500">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="group-hover:hidden font-mono text-slate-400">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudio(track);
              }}
              className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500 text-white cursor-pointer hover:bg-rose-600 transition-colors shadow-sm"
              title={t.youtube.playAudio}
            >
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </button>
          </div>
        )}
      </td>

      {/* Thumbnail + Title + Channel */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10">
            {track.thumbnailUrl ? (
              <img
                src={track.thumbnailUrl}
                alt={track.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-rose-500">
                <Youtube className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`font-semibold text-xs truncate max-w-xs sm:max-w-md md:max-w-lg ${
                isCurrentlyPlaying
                  ? "text-rose-600 dark:text-rose-400 font-bold"
                  : "text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400"
              }`}
              title={track.name}
            >
              {track.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {track.artist || track.youtubeChannel || "YouTube Creator"}
            </p>
          </div>
        </div>
      </td>

      {/* Source Tag */}
      <td className="py-3 px-3 hidden sm:table-cell">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <Youtube className="w-3 h-3" /> YouTube Audio
        </span>
      </td>

      {/* Duration */}
      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
        {track.formattedDuration || "--:--"}
      </td>

      {/* Actions */}
      <td className="py-3 pr-4 pl-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio(track);
            }}
            className="btn-icon p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20"
            title={isCurrentlyPlaying ? t.common.actions : t.youtube.playAudio}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4 text-rose-500 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </button>

          {onAddToQueue && (
            <button
              type="button"
              onClick={handleQueue}
              className="btn-icon p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={t.youtube.addToQueue}
            >
              {queued ? <Check className="w-4 h-4 text-emerald-500" /> : <Plus className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenVideo(track);
            }}
            className="btn-icon p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={t.youtube.watchVideo}
          >
            <Film className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="btn-icon p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title={t.youtube.copyLink}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {ytWatchUrl && (
            <a
              href={ytWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="btn-icon btn-icon-bounce-x p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={t.youtube.openYouTube}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
};

