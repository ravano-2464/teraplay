import { TeraBoxFile } from "@/types/terabox";
import { WatchHistoryItem } from "@/types/watchHistory";
import { formatDuration } from "./formatters";

const STORAGE_KEY = "teraplay_watch_history_v1";
const MAX_HISTORY_ITEMS = 150;
export const HISTORY_EVENT_NAME = "teraplay_watch_history_changed";

/**
 * Safely retrieve watch history from localStorage
 */
export function getWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn("Error reading watch history from localStorage:", err);
  }

  return [];
}

/**
 * Save history list to localStorage and broadcast change event
 */
function persistHistory(items: WatchHistoryItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent(HISTORY_EVENT_NAME, { detail: items })
    );
  } catch (err) {
    console.warn("Error writing watch history to localStorage:", err);
  }
}

/**
 * Adds or updates a watched file in watch history
 */
export function addToWatchHistory(
  file: TeraBoxFile,
  mediaType: "audio" | "video"
): WatchHistoryItem[] {
  if (!file) return getWatchHistory();

  const currentList = getWatchHistory();
  const fileId = file.id || (file.youtubeId ? `yt-${file.youtubeId}` : file.name);
  const ytId = file.youtubeId || (file.id?.startsWith("yt-") ? file.id.replace("yt-", "") : undefined);

  // Normalize media properties
  const isYoutube = Boolean(
    ytId ||
    file.isYoutubeFallback ||
    file.sourceType === "youtube-fallback"
  );

  const title = file.youtubeTitle || file.name || "Untitled Track";
  const artist = file.youtubeChannel || file.artist || (isYoutube ? "YouTube" : "TeraBox Media");
  const thumbnail =
    file.youtubeThumbnail ||
    file.thumbnailUrl ||
    (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined);

  const dur = file.duration || 0;
  const formattedDur =
    file.formattedDuration ||
    (dur > 0 ? formatDuration(dur) : undefined);

  // Construct full clean item
  const newItem: WatchHistoryItem = {
    id: fileId,
    name: file.name,
    title,
    artist,
    album: file.album,
    duration: dur,
    formattedDuration: formattedDur,
    category: file.category || (mediaType === "video" ? "video" : "audio"),
    mediaType,
    sourceType: isYoutube ? "youtube-fallback" : "terabox-live",
    thumbnailUrl: thumbnail,
    youtubeId: ytId,
    youtubeTitle: file.youtubeTitle || (isYoutube ? title : undefined),
    youtubeChannel: file.youtubeChannel || (isYoutube ? artist : undefined),
    streamUrl: file.streamUrl,
    downloadUrl: file.downloadUrl,
    watchedAt: Date.now(),
    file: {
      ...file,
      id: fileId,
      name: file.name,
      youtubeId: ytId || file.youtubeId,
      youtubeTitle: file.youtubeTitle || title,
      youtubeChannel: file.youtubeChannel || artist,
      thumbnailUrl: thumbnail,
      youtubeThumbnail: thumbnail,
      duration: dur,
      formattedDuration: formattedDur,
    },
  };

  // Remove duplicate entries (matching id, fsId, or youtubeId)
  const filtered = currentList.filter((item) => {
    if (item.id === fileId) return false;
    if (ytId && item.youtubeId && item.youtubeId === ytId) return false;
    if (file.fsId && item.file.fsId && item.file.fsId === file.fsId) return false;
    return true;
  });

  const updatedList = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  persistHistory(updatedList);
  return updatedList;
}

/**
 * Updates the recorded duration of a watched item
 */
export function updateHistoryItemDuration(
  fileId: string,
  durationInSeconds: number
): void {
  if (!fileId || !durationInSeconds || durationInSeconds <= 0) return;

  const currentList = getWatchHistory();
  let modified = false;

  const updatedList = currentList.map((item) => {
    if (
      item.id === fileId ||
      item.file.id === fileId ||
      item.file.fsId === fileId ||
      (item.youtubeId && (fileId === item.youtubeId || fileId === `yt-${item.youtubeId}`))
    ) {
      modified = true;
      const rounded = Math.round(durationInSeconds);
      const fmt = formatDuration(rounded);
      return {
        ...item,
        duration: rounded,
        formattedDuration: fmt,
        file: {
          ...item.file,
          duration: rounded,
          formattedDuration: fmt,
        },
      };
    }
    return item;
  });

  if (modified) {
    persistHistory(updatedList);
  }
}

/**
 * Removes an item from watch history by ID
 */
export function removeFromWatchHistory(id: string): WatchHistoryItem[] {
  const currentList = getWatchHistory();
  const updatedList = currentList.filter((item) => item.id !== id);
  persistHistory(updatedList);
  return updatedList;
}

/**
 * Clears all watch history
 */
export function clearWatchHistory(): void {
  persistHistory([]);
}

/**
 * Format timestamp relative to now (e.g., "Baru saja", "5 menit lalu", "2 jam lalu", "Kemarin")
 */
export function formatRelativeTime(
  timestamp: number,
  lang: string = "indonesian"
): string {
  if (!timestamp) return "";

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isEn = lang === "english";

  if (diffSec < 45) {
    return isEn ? "Just now" : "Baru saja";
  }
  if (diffMin < 60) {
    return isEn
      ? `${diffMin} min${diffMin > 1 ? "s" : ""} ago`
      : `${diffMin} menit lalu`;
  }
  if (diffHour < 24) {
    return isEn
      ? `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
      : `${diffHour} jam lalu`;
  }
  if (diffDay === 1) {
    return isEn ? "Yesterday" : "Kemarin";
  }
  if (diffDay < 7) {
    return isEn ? `${diffDay} days ago` : `${diffDay} hari lalu`;
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString(isEn ? "en-US" : "id-ID", {
    month: "short",
    day: "numeric",
  });
}
