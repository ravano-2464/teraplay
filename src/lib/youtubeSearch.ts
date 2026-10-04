export interface YouTubeSearchResult {
  id: string;
  title: string;
  duration: number; // in seconds
  formattedDuration: string; // e.g. "03:45"
  thumbnailUrl: string;
  channel: string;
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
  const clean = durationStr.replace(/\./g, ":");
  const parts = clean.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Searches YouTube without API keys using YouTube public scrape and fallback public instances.
 */
export async function searchYouTube(query: string, limit = 5): Promise<YouTubeSearchResult[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  // Primary: Direct YouTube Search scrape
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(6000),
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

        for (const sec of sections) {
          const contents = sec?.itemSectionRenderer?.contents || [];
          for (const item of contents) {
            if (item.videoRenderer) {
              const vr = item.videoRenderer;
              const id = vr.videoId;
              if (!id) continue;

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
        signal: AbortSignal.timeout(3500),
      });
      if (invRes.ok) {
        const invData = await invRes.json();
        const items = Array.isArray(invData) ? invData : invData?.items || [];
        if (Array.isArray(items) && items.length > 0) {
          const fallbackResults: YouTubeSearchResult[] = [];
          for (const v of items) {
            const videoId = v.videoId || (v.url ? v.url.replace("/watch?v=", "") : "");
            if (!videoId) continue;
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
