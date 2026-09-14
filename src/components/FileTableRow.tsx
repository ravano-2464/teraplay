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
} from "lucide-react";
import { TeraBoxFile } from "@/types/terabox";
import { CATEGORY_COLORS, formatDuration } from "@/lib/formatters";

interface FileTableRowProps {
  file: TeraBoxFile;
  index: number;
  isCurrentlyPlayingAudio: boolean;
  onPlayAudio: (file: TeraBoxFile) => void;
  onOpenVideo: (file: TeraBoxFile) => void;
}

export const FileTableRow: React.FC<FileTableRowProps> = ({
  file,
  index,
  isCurrentlyPlayingAudio,
  onPlayAudio,
  onOpenVideo,
}) => {
  const [copied, setCopied] = React.useState(false);
  const styling = CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other;

  const displayDuration =
    file.formattedDuration ||
    (file.duration ? formatDuration(file.duration) : (file.category === "audio" || file.category === "video" ? "--:--" : "-"));

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = file.downloadUrl || file.streamUrl || window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRowClick = () => {
    if (file.category === "audio") {
      onPlayAudio(file);
    } else if (file.category === "video") {
      onOpenVideo(file);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`group border-b border-white/5 transition-all cursor-pointer ${
        isCurrentlyPlayingAudio
          ? "bg-emerald-500/15 text-white"
          : "hover:bg-slate-900/80 text-slate-300"
      }`}
    >
      {/* Index / Play action */}
      <td className="py-3.5 pl-4 pr-2 w-12 text-center">
        {file.category === "audio" || file.category === "video" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick();
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isCurrentlyPlayingAudio
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "text-slate-400 group-hover:bg-slate-800 group-hover:text-white"
            }`}
          >
            {isCurrentlyPlayingAudio ? (
              <Radio className="w-4 h-4 animate-pulse" />
            ) : (
              <span className="group-hover:hidden font-mono text-xs">{index + 1}</span>
            )}
            <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block ml-0.5" />
          </button>
        ) : (
          <span className="font-mono text-xs text-slate-500">{index + 1}</span>
        )}
      </td>

      {/* Title & Artist & Thumbnail */}
      <td className="py-3.5 px-3 min-w-0">
        <div className="flex items-center gap-3">
          {file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl}
              alt=""
              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10"
            />
          ) : (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${styling.bg} ${styling.text} border ${styling.border}`}>
              {file.category === "audio" && <Music className="w-4 h-4" />}
              {file.category === "video" && <Film className="w-4 h-4" />}
              {file.category === "image" && <ImageIcon className="w-4 h-4" />}
              {file.category === "document" && <FileText className="w-4 h-4" />}
              {file.category === "archive" && <Archive className="w-4 h-4" />}
              {file.category === "other" && <File className="w-4 h-4" />}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-xs sm:text-sm text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                {file.name}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate">
              {file.artist && (
                <span className="truncate">{file.artist} {file.album ? `• ${file.album}` : ""}</span>
              )}
              {(file.category === "audio" || file.category === "video") && displayDuration !== "-" && (
                <span className="md:hidden inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400/90 font-medium">
                  <Clock className="w-2.5 h-2.5" />
                  {displayDuration}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Category / Extension Badge */}
      <td className="py-3.5 px-3 hidden sm:table-cell">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${styling.badge}`}>
          {file.extension}
        </span>
      </td>

      {/* File Size in MB (Key requirement) */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
          {file.formattedSize}
        </span>
      </td>

      {/* Duration */}
      <td className="py-3.5 px-3 font-mono text-xs text-slate-400 hidden md:table-cell whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 border border-white/5 text-slate-300">
          <Clock className="w-3 h-3 text-slate-400" />
          {displayDuration}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
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
            title="Salin link direct"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {file.downloadUrl && (
            <a
              href={file.downloadUrl}
              download={file.name}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-sky-500 hover:text-slate-950 text-slate-300 transition-all cursor-pointer"
              title={`Download ${file.name}`}
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
};
