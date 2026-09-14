import { FileCategory } from "@/types/terabox";

/**
 * Converts bytes into readable format like "4.85 MB", "1.20 GB", "750 KB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  if (isNaN(bytes) || bytes < 0) return "0 MB";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Format duration in seconds to "mm:ss" or "hh:mm:ss"
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "--:--";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const formattedM = m < 10 && h > 0 ? `0${m}` : `${m}`;
  const formattedS = s < 10 ? `0${s}` : `${s}`;

  if (h > 0) {
    return `${h}:${formattedM}:${formattedS}`;
  }
  return `${m}:${formattedS}`;
}

/**
 * Detects file category and extension from file name or mime type
 */
export function detectFileCategory(fileName: string, mime?: string): { category: FileCategory; extension: string } {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";

  const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus", "alac", "aiff"];
  const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "3gp", "ts"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "ico", "avif"];
  const docExts = ["pdf", "doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx", "md"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"];

  if (audioExts.includes(extension) || mime?.startsWith("audio/")) {
    return { category: "audio", extension };
  }
  if (videoExts.includes(extension) || mime?.startsWith("video/")) {
    return { category: "video", extension };
  }
  if (imageExts.includes(extension) || mime?.startsWith("image/")) {
    return { category: "image", extension };
  }
  if (docExts.includes(extension) || mime?.startsWith("text/") || mime?.includes("pdf") || mime?.includes("document")) {
    return { category: "document", extension };
  }
  if (archiveExts.includes(extension) || mime?.includes("zip") || mime?.includes("compressed")) {
    return { category: "archive", extension };
  }

  return { category: "other", extension: extension || "bin" };
}

/**
 * Category styling config
 */
export const CATEGORY_COLORS: Record<
  FileCategory,
  { bg: string; text: string; border: string; glow: string; badge: string; label: string }
> = {
  audio: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.25)]",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    label: "Audio Track",
  },
  video: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_15px_rgba(6,182,212,0.25)]",
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    label: "Video",
  },
  image: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.25)]",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    label: "Image",
  },
  document: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    label: "Document",
  },
  archive: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.25)]",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    label: "Archive",
  },
  folder: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.25)]",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    label: "Folder",
  },
  other: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    glow: "shadow-[0_0_15px_rgba(148,163,184,0.15)]",
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    label: "File",
  },
};
