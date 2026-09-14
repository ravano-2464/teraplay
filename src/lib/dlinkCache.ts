// Shared in-memory cache for resolved direct download/stream links
interface CacheEntry {
  url: string;
  expiresAt: number;
}

// Global cache singleton across API routes
const globalDlinkCache = new Map<string, CacheEntry>();

export function getCachedDlink(key: string): string | null {
  if (!key) return null;
  const entry = globalDlinkCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    globalDlinkCache.delete(key);
    return null;
  }
  return entry.url;
}

export function setCachedDlink(key: string, url: string, ttlHours: number = 4) {
  if (!key || !url) return;
  globalDlinkCache.set(key, {
    url,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  });
}
