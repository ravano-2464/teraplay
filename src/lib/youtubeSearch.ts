export interface YouTubeSearchResult {
  id: string;
  title: string;
  duration: number; // in seconds
  formattedDuration: string; // e.g. "03:45"
  thumbnailUrl: string;
  channel: string;
  views?: string;
  uploadedAt?: string;
}

/**
 * Extracts a YouTube Video ID from any standard YouTube URL or returns null
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
  const match = clean.match(regExp);
  return match ? match[1] : null;
}

/**
 * Cleans file names (removes extensions, file sizes, bracket info, track indices)
 * to construct a clean search query for YouTube.
 */
export function cleanSearchQuery(filename: string, artist?: string): string {
  let q = filename || "";

  // 1. Strip file extension
  q = q.replace(/\.[a-zA-Z0-9]{2,5}$/i, "");

  // 2. Replace separators (underscores, dashes, pluses) with spaces first
  q = q.replace(/[_\-+]/g, " ");

  // 3. Remove bracket contents like [Official Video], (Audio), [320kbps], (Slowed + Reverb)
  q = q.replace(/\[(?:official|audio|video|lyrics|hd|4k|hq|320kbps|128kbps|flac|mp3|remastered)[^\]]*\]/gi, " ");
  q = q.replace(/\((?:official|audio|video|lyrics|hd|4k|hq|320kbps|128kbps|flac|mp3|remastered)[^\)]*\)/gi, " ");
  q = q.replace(/\[[^\]]*\]/g, " ");

  // 4. Remove file sizes like 46.7MB, 5.42MB, 100M, 1024KB
  q = q.replace(/\b\d+(?:[.,]\d+)?\s*(?:bytes?|mb|gb|kb|mib|gib|kib|b|m|g|k)\b/gi, " ");

  // 5. Remove leading numbers like "01.", "01 - ", "Track 01"
  q = q.replace(/^(?:track\s*[-_]?\s*\d+|\d+[\.\s\-_]+)/i, "");

  // 6. Normalize whitespace
  q = q.replace(/\s+/g, " ").trim();
  q = q.replace(/[.,\s]+$/, "").trim();

  // 7. Prepend artist if provided and not already included
  if (
    artist &&
    artist !== "TeraBox Music" &&
    artist !== "Unknown Artist" &&
    !q.toLowerCase().includes(artist.toLowerCase())
  ) {
    return `${artist} ${q}`.trim();
  }

  return q || filename;
}

/**
 * Parses duration string (e.g. "3:45" or "1:02:15") into total seconds
 */
export function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const clean = durationStr.replace(/\./g, ":").trim();
  const parts = clean.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Curated trending & popular songs for initial state in Full YouTube Mode
 */
export const POPULAR_YOUTUBE_TRACKS: YouTubeSearchResult[] = [
  {
    id: "kJQP7kiw5Fk",
    title: "Luis Fonsi - Despacito ft. Daddy Yankee",
    duration: 282,
    formattedDuration: "04:42",
    thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
    channel: "Luis Fonsi",
  },
  {
    id: "JGwWNGJdvx8",
    title: "Ed Sheeran - Shape of You (Official Music Video)",
    duration: 263,
    formattedDuration: "04:23",
    thumbnailUrl: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
    channel: "Ed Sheeran",
  },
  {
    id: "fJ9rUzIMcZQ",
    title: "Queen - Bohemian Rhapsody (Official Video Remastered)",
    duration: 359,
    formattedDuration: "05:59",
    thumbnailUrl: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
    channel: "Queen Official",
  },
  {
    id: "5qap5aO4i9A",
    title: "lofi hip hop radio 📚 beats to relax/study to",
    duration: 0,
    formattedDuration: "LIVE",
    thumbnailUrl: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
    channel: "Lofi Girl",
  },
  {
    id: "OPf0YbXqDm0",
    title: "Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars",
    duration: 270,
    formattedDuration: "04:30",
    thumbnailUrl: "https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg",
    channel: "Mark Ronson",
  },
  {
    id: "RgKAFK5djSk",
    title: "Wiz Khalifa - See You Again ft. Charlie Puth [Official Video]",
    duration: 237,
    formattedDuration: "03:57",
    thumbnailUrl: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg",
    channel: "Wiz Khalifa",
  },
];

/**
 * Searches YouTube without API keys using YouTube public scrape and fallback public instances.
 */
export async function searchYouTube(query: string, limit = 20): Promise<YouTubeSearchResult[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return POPULAR_YOUTUBE_TRACKS;

  // If user pasted a direct YouTube link, resolve directly
  const directId = extractYouTubeVideoId(cleanQ);
  if (directId) {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directId}&format=json`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        return [
          {
            id: directId,
            title: oembed.title || "YouTube Track",
            duration: 210,
            formattedDuration: "03:30",
            thumbnailUrl: oembed.thumbnail_url || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
            channel: oembed.author_name || "YouTube Creator",
          },
        ];
      }
    } catch {
      return [
        {
          id: directId,
          title: "YouTube Video (" + directId + ")",
          duration: 210,
          formattedDuration: "03:30",
          thumbnailUrl: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          channel: "YouTube",
        },
      ];
    }
  }

  // Primary: Direct YouTube Search scrape
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(6500),
    });

    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
        html.match(/ytInitialData\s*=\s*({[\s\S]*?});/);

      if (match) {
        const data = JSON.parse(match[1]);
        const sections =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
            ?.contents || [];

        const results: YouTubeSearchResult[] = [];
        const seenIds = new Set<string>();

        for (const sec of sections) {
          const contents = sec?.itemSectionRenderer?.contents || [];
          for (const item of contents) {
            if (item.videoRenderer) {
              const vr = item.videoRenderer;
              const id = vr.videoId;
              if (!id || seenIds.has(id)) continue;
              seenIds.add(id);

              const title =
                vr.title?.runs?.map((r: any) => r.text).join("") ||
                vr.title?.simpleText ||
                "YouTube Audio";

              const formattedDuration = vr.lengthText?.simpleText || "03:30";
              const duration = parseDurationToSeconds(formattedDuration);

              const channel =
                vr.ownerText?.runs?.map((r: any) => r.text).join("") ||
                vr.longBylineText?.runs?.map((r: any) => r.text).join("") ||
                "YouTube Creator";

              const views = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || "";
              const uploadedAt = vr.publishedTimeText?.simpleText || "";

              const thumbs = vr.thumbnail?.thumbnails || [];
              const thumbnailUrl =
                thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

              results.push({
                id,
                title,
                duration,
                formattedDuration,
                thumbnailUrl,
                channel,
                views,
                uploadedAt,
              });

              if (results.length >= limit) break;
            }
          }
          if (results.length >= limit) break;
        }

        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch (err: any) {
    console.warn("YouTube direct search notice:", err?.message);
  }

  // Fallback: Multiple Invidious & Piped Search APIs
  const fallbackEndpoints = [
    `https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://vid.priv.au/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://invidious.jing.rocks/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://invidious.no-val.org/api/v1/search?q=${encodeURIComponent(cleanQ)}&type=video`,
    `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(cleanQ)}&filter=videos`,
  ];

  for (const ep of fallbackEndpoints) {
    try {
      const invRes = await fetch(ep, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        const items = Array.isArray(invData) ? invData : invData?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          const fallbackResults: YouTubeSearchResult[] = [];
          const seenIds = new Set<string>();

          for (const v of items) {
            const videoId = v.videoId || (v.url ? v.url.replace("/watch?v=", "") : "");
            if (!videoId || seenIds.has(videoId)) continue;
            seenIds.add(videoId);

            const durationSec = v.lengthSeconds || v.duration || 200;
            const mins = Math.floor(durationSec / 60);
            const secs = durationSec % 60;
            const formatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
            fallbackResults.push({
              id: videoId,
              title: v.title || "YouTube Audio",
              duration: durationSec,
              formattedDuration: formatted,
              thumbnailUrl: v.videoThumbnails?.[0]?.url || v.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              channel: v.author || v.uploaderName || "YouTube Artist",
              views: v.viewCount ? `${(v.viewCount / 1000).toFixed(0)} rb x ditonton` : undefined,
            });
            if (fallbackResults.length >= limit) break;
          }
          if (fallbackResults.length > 0) {
            return fallbackResults;
          }
        }
      }
    } catch {
      // continue to next endpoint
    }
  }

  return [];
}

/**
 * Resolves the single best YouTube matching track for a given file name & artist.
 */
export async function resolveBestYouTubeTrack(
  filename: string,
  artist?: string
): Promise<YouTubeSearchResult | null> {
  const query = cleanSearchQuery(filename, artist);
  const results = await searchYouTube(query, 3);
  return results[0] || null;
}
