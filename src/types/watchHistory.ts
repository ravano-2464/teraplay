import { TeraBoxFile } from "./terabox";

export interface WatchHistoryItem {
  id: string;
  name: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  formattedDuration?: string;
  category: "audio" | "video" | "image" | "document" | "archive" | "folder" | "other";
  mediaType: "audio" | "video";
  sourceType: "terabox-live" | "youtube-fallback" | "custom";
  thumbnailUrl?: string;
  youtubeId?: string;
  youtubeTitle?: string;
  youtubeChannel?: string;
  streamUrl?: string;
  downloadUrl?: string;
  watchedAt: number; // Date.now() timestamp
  file: TeraBoxFile; // Original file payload for instant replay
}
