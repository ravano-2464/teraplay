import { TeraBoxFile, TeraBoxFolderResult, FolderStats } from "@/types/terabox";
import { formatBytes, formatDuration, detectFileCategory } from "./formatters";
import { setCachedDlink } from "./dlinkCache";

export interface ParsedTeraBoxInput {
  originalUrl: string;
  shorturl?: string;
  folderPath?: string;
  category?: string;
  isValid: boolean;
  domain: string;
}

/**
 * Parses any incoming TeraBox URL
 */
export function parseTeraBoxUrl(inputUrl: string): ParsedTeraBoxInput {
  try {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      return { originalUrl: inputUrl, isValid: false, domain: "" };
    }

    // Direct folder path input (e.g. "/Music" or "/Movies/Action")
    if (trimmed.startsWith("/")) {
      return {
        originalUrl: trimmed,
        folderPath: trimmed,
        isValid: true,
        domain: "dm.terabox.com",
      };
    }

    const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const domain = urlObj.hostname.toLowerCase();
    const searchParams = urlObj.searchParams;

    const pathParam = searchParams.get("path");
    const categoryParam = searchParams.get("category");

    // Check for /s/XXXX or /sharing/link?surl=XXXX
    let shorturl: string | undefined = undefined;
    const matchSurl = urlObj.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
    if (matchSurl && matchSurl[1]) {
      shorturl = matchSurl[1];
    } else if (searchParams.get("surl")) {
      shorturl = searchParams.get("surl") || undefined;
    }

    const isTeraBoxDomain =
      domain.includes("terabox") ||
      domain.includes("1024tera") ||
      domain.includes("nephobox") ||
      domain.includes("4funbox") ||
      domain.includes("mirrobox") ||
      domain.includes("momerybox");

    return {
      originalUrl: trimmed,
      shorturl,
      folderPath: pathParam || (urlObj.pathname !== "/" && !shorturl ? urlObj.pathname : undefined),
      category: categoryParam || undefined,
      isValid: isTeraBoxDomain || !!pathParam || !!shorturl,
      domain,
    };
  } catch {
    return {
      originalUrl: inputUrl,
      isValid: false,
      domain: "",
    };
  }
}

/**
 * Calculate statistical overview for a list of files
 */
export function calculateFolderStats(files: TeraBoxFile[], foldersCount: number = 0): FolderStats {
  let totalSize = 0;
  let audioCount = 0;
  let videoCount = 0;
  let imageCount = 0;
  let docCount = 0;
  let archiveCount = 0;

  files.forEach((file) => {
    totalSize += file.size;
    if (file.category === "audio" || file.extension === "mp3" || file.extension === "wav" || file.extension === "flac") audioCount++;
    else if (file.category === "video" || file.extension === "mp4") videoCount++;
    else if (file.category === "image") imageCount++;
    else if (file.category === "document") docCount++;
    else if (file.category === "archive") archiveCount++;
  });

  const hasAudio = audioCount > 0;
  const hasVideo = videoCount > 0;

  let primaryCategory: FolderStats["primaryCategory"] = "other";
  const counts = [
    { cat: "audio" as const, count: audioCount },
    { cat: "video" as const, count: videoCount },
    { cat: "image" as const, count: imageCount },
    { cat: "document" as const, count: docCount },
    { cat: "archive" as const, count: archiveCount },
  ];

  counts.sort((a, b) => b.count - a.count);
  if (counts[0] && counts[0].count > 0) {
    primaryCategory = counts[0].cat;
  }

  return {
    totalFiles: files.length,
    totalFolders: foldersCount,
    totalSize,
    formattedTotalSize: formatBytes(totalSize),
    audioCount,
    videoCount,
    imageCount,
    docCount,
    archiveCount,
    hasAudio,
    hasVideo,
    primaryCategory,
  };
}

/**
 * Clean & normalize cookie string format
 */
export function formatNdusCookie(cookie: string): string {
  const trimmed = cookie.trim();
  if (!trimmed) return "";
  if (trimmed.includes("ndus=")) {
    return trimmed;
  }
  return `ndus=${trimmed}`;
}

/**
 * Real Live Resolver: Hits TeraBox APIs directly (Private Drive API via ndus or Public Share API)
 */
export async function resolveTeraBoxFolder(inputUrl: string, ndusCookie?: string): Promise<TeraBoxFolderResult> {
  const parsed = parseTeraBoxUrl(inputUrl);

  // 1. If it's a Private Personal Drive Link (dm.terabox.com/main?path=...)
  if (parsed.folderPath || inputUrl.includes("dm.terabox.com")) {
    const requestedPath = parsed.folderPath ? decodeURIComponent(parsed.folderPath) : "/";
    let activePath = requestedPath;
    let folderTitle = activePath.split("/").filter(Boolean).pop() || "TeraBox Cloud Drive";

    // Attempt Live Call to TeraBox Private API with Cookie
    if (ndusCookie && ndusCookie.trim()) {
      const cleanCookie = formatNdusCookie(ndusCookie);
      let authFailed = false;

      try {
        let rawFiles: any[] = [];
        const targetPath = requestedPath.startsWith("/") ? requestedPath : `/${requestedPath}`;
        let page = 1;
        const pageSize = 100;
        let hasMore = true;
        const maxPages = 30;
        let currentPathFiles: any[] = [];
        let isFolderAccessible = false;

        while (hasMore && page <= maxPages) {
          const apiUrl = `https://dm.terabox.com/api/list?dir=${encodeURIComponent(targetPath)}&order=time&desc=1&clienttype=0&app_id=250528&web=1&page=${page}&num=${pageSize}&dlink=1`;

          const res = await fetch(apiUrl, {
            headers: {
              "Cookie": cleanCookie,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Referer": "https://dm.terabox.com/main",
              "Accept": "application/json, text/plain, */*",
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) break;

          const data = await res.json();
          if (data?.errno === -6) {
            authFailed = true;
            break;
          }

          if (data && data.errno === 0) {
            isFolderAccessible = true;
            if (Array.isArray(data.list) && data.list.length > 0) {
              currentPathFiles.push(...data.list);
              if (data.list.length < pageSize || data.has_more === 0) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        if (isFolderAccessible) {
          rawFiles = currentPathFiles;
          activePath = targetPath;
          folderTitle = targetPath === "/" ? "Root Drive (/)" : targetPath.split("/").filter(Boolean).pop() || "TeraBox Folder";
        }

        if (rawFiles.length > 0) {
          // Fast-fetch metadata (dlinks and real durations) for files
          const pathMap = new Map<string, any>();
          const allPaths: string[] = rawFiles
            .filter((item: any) => item.isdir !== 1 && item.is_dir !== 1 && item.path)
            .map((item: any) => item.path);

          if (allPaths.length > 0) {
            // Batch into chunks of 50 paths (TeraBox filemetas maximum optimal batch)
            const chunks: string[][] = [];
            for (let i = 0; i < Math.min(allPaths.length, 100); i += 50) {
              chunks.push(allPaths.slice(i, i + 50));
            }

            await Promise.all(
              chunks.map(async (chunk) => {
                try {
                  const metaUrl = `https://dm.terabox.com/api/filemetas?app_id=250528&web=1&channel=dubox&clienttype=0&target=${encodeURIComponent(JSON.stringify(chunk))}&dlink=1`;
                  const metaRes = await fetch(metaUrl, {
                    headers: {
                      "Cookie": cleanCookie,
                      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                      "Referer": "https://dm.terabox.com/main",
                      "Accept": "application/json, text/plain, */*",
                    },
                    signal: AbortSignal.timeout(3500),
                  });
                  if (metaRes.ok) {
                    const metaJson = await metaRes.json();
                    if (metaJson && Array.isArray(metaJson.info)) {
                      metaJson.info.forEach((infoItem: any) => {
                        if (infoItem.path) {
                          pathMap.set(infoItem.path, infoItem);
                          if (infoItem.dlink) setCachedDlink(infoItem.path, infoItem.dlink);
                        }
                        if (infoItem.fs_id) {
                          pathMap.set(String(infoItem.fs_id), infoItem);
                          if (infoItem.dlink) setCachedDlink(String(infoItem.fs_id), infoItem.dlink);
                        }
                      });
                    }
                  }
                } catch {
                  // route.ts handles dynamic on-demand fallback
                }
              })
            );
          }

          const seenIds = new Set<string>();
          const files: TeraBoxFile[] = [];
          const folders: { name: string; path: string; itemCount?: number }[] = [];

          rawFiles.forEach((item: any, idx: number) => {
            const isDir = item.isdir === 1 || item.is_dir === 1;
            const fileName = item.server_filename || item.filename || `File_${idx + 1}`;
            const key = item.fs_id ? String(item.fs_id) : item.path || `${fileName}_${idx}`;
            if (seenIds.has(key)) return;
            seenIds.add(key);

            const size = Number(item.size || 0);
            const { category, extension } = detectFileCategory(fileName);
            const isMusicLike = fileName.toLowerCase().includes("slowed") || fileName.toLowerCase().includes("music") || fileName.toLowerCase().includes("video") || activePath.toLowerCase().includes("music");

            if (isDir) {
              folders.push({
                name: fileName,
                path: item.path || `${activePath}/${fileName}`,
              });
            } else {
              const fsId = item.fs_id ? String(item.fs_id) : undefined;
              const filePath = item.path || `${activePath}/${fileName}`;
              const metaInfo = pathMap.get(filePath) || (fsId ? pathMap.get(fsId) : null);
              const directDlink = metaInfo?.dlink || item.dlink;
              const cookieParam = cleanCookie ? `&cookie=${encodeURIComponent(cleanCookie)}` : "";
              const fileParam = `&filename=${encodeURIComponent(fileName)}`;

              // Stream URL with direct dlink or on-demand resolution
              const streamUrl = directDlink
                ? `/api/terabox/stream?url=${encodeURIComponent(directDlink)}${fileParam}${cookieParam}`
                : `/api/terabox/stream?fsId=${fsId || ""}&path=${encodeURIComponent(filePath)}${fileParam}${cookieParam}`;

              const downloadUrl = `${streamUrl}&download=true`;

              const rawDuration = Number(metaInfo?.duration || metaInfo?.time_length || item.duration || item.dur || item.play_time || 0);
              const durationNum = rawDuration > 0 ? rawDuration : undefined;
              const formattedDur = durationNum ? formatDuration(durationNum) : undefined;

              files.push({
                id: fsId || `file-${idx}`,
                name: fileName,
                size,
                formattedSize: formatBytes(size),
                category: isMusicLike ? "audio" : category,
                extension,
                downloadUrl,
                streamUrl,
                thumbnailUrl: item.thumbs?.url3 || item.thumbs?.url2 || item.thumbs?.url1 || undefined,
                duration: durationNum,
                formattedDuration: formattedDur,
                artist: isMusicLike ? (fileName.includes("-") ? fileName.split("-")[0].trim() : "TeraBox Audio") : undefined,
                album: isMusicLike ? activePath.replace(/^\//, "") : undefined,
                updatedAt: item.server_mtime ? new Date(item.server_mtime * 1000).toLocaleDateString() : undefined,
                isDir: false,
                fsId,
                path: filePath,
                sourceType: "terabox-live",
              });
            }
          });

          const stats = calculateFolderStats(files, folders.length);

          return {
            folderName: folderTitle,
            folderPath: activePath,
            shareUrl: inputUrl,
            stats,
            files,
            folders,
            isAudioFolder: stats.audioCount > 0,
            source: "direct-api",
            requiresCookie: false,
          };
        }

        if (authFailed) {
          return {
            folderName: folderTitle,
            folderPath: requestedPath,
            shareUrl: inputUrl,
            stats: calculateFolderStats([]),
            files: [],
            folders: [],
            isAudioFolder: false,
            source: "direct-api",
            requiresCookie: true,
            noticeMessage: "Cookie ndus Anda tidak valid atau sudah kedaluwarsa (TeraBox errno: -6). Silakan login ulang ke terabox.com dan salin nilai cookie ndus terbaru.",
          };
        }
      } catch (e: any) {
        console.warn("Direct private API request error:", e?.message);
      }
    }

    // If no ndus cookie or fetch yielded nothing, return clean requiresCookie state
    return {
      folderName: folderTitle,
      folderPath: requestedPath,
      shareUrl: inputUrl,
      stats: calculateFolderStats([]),
      files: [],
      folders: [],
      isAudioFolder: false,
      source: "direct-api",
      requiresCookie: !ndusCookie,
      noticeMessage: ndusCookie
        ? `Folder "${requestedPath}" kosong atau tidak ditemukan di akun TeraBox Anda.`
        : "Link ini adalah Folder Private TeraBox (dm.terabox.com). Harap hubungkan Cookie ndus TeraBox Anda untuk melihat file dan memutar audio.",
    };
  }

  // 2. If it's a Public Share Link (/s/1XXXXX or surl=XXXXX)
  if (parsed.shorturl) {
    const cleanSurl = parsed.shorturl.replace(/^1/, "");
    try {
      const rawFiles: any[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      const maxPages = 50;

      while (hasMore && page <= maxPages) {
        const teraboxApiUrl = `https://www.1024tera.com/api/share/list?app_id=250528&shorturl=${cleanSurl}&root=1&page=${page}&num=${pageSize}&dlink=1`;

        const res = await fetch(teraboxApiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://www.1024tera.com/",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) break;

        const data = await res.json();
        if (data && data.list && Array.isArray(data.list) && data.list.length > 0) {
          rawFiles.push(...data.list);
          if (data.list.length < pageSize || data.has_more === 0) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (rawFiles.length > 0) {
        const seenIds = new Set<string>();
        const files: TeraBoxFile[] = [];
        const folders: { name: string; path: string; itemCount?: number }[] = [];

        rawFiles.forEach((item: any, idx: number) => {
          const isDir = item.isdir === 1 || item.is_dir === 1;
          const fileName = item.server_filename || item.filename || `File_${idx + 1}`;
          const key = item.fs_id ? String(item.fs_id) : item.path || `${fileName}_${idx}`;
          if (seenIds.has(key)) return;
          seenIds.add(key);

          const size = Number(item.size || 0);
          const { category, extension } = detectFileCategory(fileName);

          if (isDir) {
            folders.push({
              name: fileName,
              path: item.path || `/${fileName}`,
            });
            const fsId = item.fs_id ? String(item.fs_id) : undefined;
            const filePath = item.path || `/${fileName}`;
            const fileParam = `&filename=${encodeURIComponent(fileName)}`;
            const streamUrl = item.dlink
              ? `/api/terabox/stream?url=${encodeURIComponent(item.dlink)}${fileParam}`
              : fsId
              ? `/api/terabox/stream?fsId=${fsId}&shorturl=${cleanSurl}&path=${encodeURIComponent(filePath)}${fileParam}`
              : undefined;

            const durationNum =
              Number(item.duration || item.dur || item.play_time || item.time_length || 0) ||
              (category === "audio" || fileName.toLowerCase().includes("music") || fileName.toLowerCase().includes("slowed")
                ? Math.max(30, Math.min(1800, Math.round(size / (extension === "mp4" ? 180000 : 40000))))
                : category === "video"
                ? Math.max(15, Math.min(7200, Math.round(size / 300000)))
                : undefined);

            const formattedDur = durationNum ? formatDuration(durationNum) : undefined;

            const downloadUrl = streamUrl ? `${streamUrl}&download=true&filename=${encodeURIComponent(fileName)}` : undefined;

            files.push({
              id: fsId || `file-${idx}`,
              name: fileName,
              size,
              formattedSize: formatBytes(size),
              category,
              extension,
              downloadUrl,
              streamUrl,
              thumbnailUrl: item.thumbs?.url3 || item.thumbs?.url2 || item.thumbs?.url1 || undefined,
              duration: durationNum,
              formattedDuration: formattedDur,
              artist: fileName.includes("-") ? fileName.split("-")[0].trim() : undefined,
              updatedAt: item.server_mtime ? new Date(item.server_mtime * 1000).toLocaleDateString() : undefined,
              isDir: false,
              fsId,
              path: filePath,
              sourceType: "terabox-live",
            });
          }
        });

        const stats = calculateFolderStats(files, folders.length);

        return {
          folderName: `TeraBox Share (${parsed.shorturl})`,
          folderPath: "/",
          shareUrl: inputUrl,
          shareKey: parsed.shorturl,
          stats,
          files,
          folders,
          isAudioFolder: stats.audioCount >= stats.totalFiles * 0.5 && stats.audioCount > 0,
          source: "direct-api",
          requiresCookie: false,
        };
      }
    } catch (e: any) {
      console.warn("Live Share API fetch failed:", e?.message);
    }

    throw new Error(`Tidak dapat memuat file dari link share "${parsed.shorturl}". Pastikan link masih aktif atau coba gunakan link public share yang valid.`);
  }

  // 3. Fallback error if URL cannot be processed
  throw new Error("Link TeraBox tidak valid. Masukkan link share publik (contoh: https://terabox.com/s/1xxxxxx) atau link folder pribadi dengan Cookie ndus.");
}
