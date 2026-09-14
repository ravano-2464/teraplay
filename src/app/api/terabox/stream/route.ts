import { NextRequest, NextResponse } from "next/server";
import { formatNdusCookie } from "@/lib/teraboxParser";

function extractDlink(data: any): string | null {
  if (!data) return null;
  if (typeof data.dlink === "string" && data.dlink.startsWith("http")) return data.dlink;
  if (Array.isArray(data.dlink) && data.dlink[0]) {
    const item = data.dlink[0];
    if (typeof item === "string" && item.startsWith("http")) return item;
    if (item.dlink && typeof item.dlink === "string") return item.dlink;
    if (item.url && typeof item.url === "string") return item.url;
  }
  if (Array.isArray(data.list) && data.list[0]?.dlink) return data.list[0].dlink;
  if (Array.isArray(data.info) && data.info[0]?.dlink) return data.info[0].dlink;
  if (Array.isArray(data.urls) && data.urls[0]?.url) return data.urls[0].url;
  return null;
}

function detectMimeType(fileName: string, mediaUrl: string, serverContentType?: string | null): string {
  const lowerName = fileName.toLowerCase();
  const lowerUrl = mediaUrl.toLowerCase();

  if (lowerName.endsWith(".mp4") || lowerUrl.includes(".mp4")) return "video/mp4";
  if (lowerName.endsWith(".mp3") || lowerUrl.includes(".mp3")) return "audio/mpeg";
  if (lowerName.endsWith(".m4a") || lowerUrl.includes(".m4a")) return "audio/mp4";
  if (lowerName.endsWith(".wav") || lowerUrl.includes(".wav")) return "audio/wav";
  if (lowerName.endsWith(".flac") || lowerUrl.includes(".flac")) return "audio/flac";
  if (lowerName.endsWith(".ogg") || lowerUrl.includes(".ogg")) return "audio/ogg";
  if (lowerName.endsWith(".webm") || lowerUrl.includes(".webm")) return "video/webm";
  if (lowerName.endsWith(".mkv") || lowerUrl.includes(".mkv")) return "video/x-matroska";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";

  if (serverContentType && serverContentType !== "application/octet-stream" && serverContentType !== "text/plain") {
    return serverContentType;
  }

  return "audio/mpeg";
}

async function resolveDirectDlink(
  path?: string | null,
  fsId?: string | null,
  cookie?: string,
  shorturl?: string | null
): Promise<string | null> {
  // 1. Try Private Drive Endpoints
  if (cookie && (path || fsId)) {
    const privateEndpoints: string[] = [];

    if (path) {
      privateEndpoints.push(
        `https://dm.terabox.com/api/filemetas?app_id=250528&web=1&channel=dubox&clienttype=0&target=${encodeURIComponent(JSON.stringify([path]))}&dlink=1`,
        `https://dm.terabox.com/api/filemetas?app_id=250528&web=1&channel=dubox&clienttype=0&target=[%22${encodeURIComponent(path)}%22]&dlink=1`
      );
    }

    if (fsId) {
      privateEndpoints.push(
        `https://dm.terabox.com/api/filemetas?app_id=250528&web=1&channel=dubox&clienttype=0&fsids=[${fsId}]&dlink=1`,
        `https://dm.terabox.com/api/download?app_id=250528&web=1&channel=dubox&clienttype=0&fid_list=[${fsId}]`,
        `https://dm.terabox.com/api/download?app_id=250528&web=1&channel=dubox&clienttype=0&fid_list=[%22${fsId}%22]`,
        `https://www.terabox.app/api/download?app_id=250528&web=1&channel=dubox&clienttype=0&fid_list=[${fsId}]`,
        `https://www.terabox.com/api/download?app_id=250528&web=1&channel=dubox&clienttype=0&fid_list=[${fsId}]`,
        `https://www.1024tera.com/api/download?app_id=250528&web=1&channel=dubox&clienttype=0&fid_list=[${fsId}]`
      );
    }

    for (const ep of privateEndpoints) {
      try {
        const res = await fetch(ep, {
          headers: {
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://dm.terabox.com/main",
            "Accept": "application/json, text/plain, */*",
          },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const found = extractDlink(data);
          if (found) return found;
        }
      } catch {
        // continue
      }
    }
  }

  // 2. Try Public Share Endpoints
  if (fsId && shorturl) {
    const cleanSurl = shorturl.replace(/^1/, "");
    const publicEndpoints = [
      `https://www.terabox.app/share/download?app_id=250528&shorturl=${cleanSurl}&fs_id=${fsId}`,
      `https://www.1024tera.com/share/download?app_id=250528&shorturl=${cleanSurl}&fs_id=${fsId}`,
      `https://www.terabox.com/api/share/download?app_id=250528&shorturl=${cleanSurl}&fs_id=${fsId}`,
      `https://www.terabox.app/api/share/download?app_id=250528&shorturl=${cleanSurl}&fid_list=[${fsId}]`,
    ];

    for (const ep of publicEndpoints) {
      try {
        const shareRes = await fetch(ep, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://www.terabox.app/",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(6000),
        });

        if (shareRes.ok) {
          const shareData = await shareRes.json();
          const found = extractDlink(shareData);
          if (found) return found;
        }
      } catch {
        // continue
      }
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let mediaUrl = searchParams.get("url");
  const fsId = searchParams.get("fsId");
  const path = searchParams.get("path");
  const shorturl = searchParams.get("shorturl");
  const isDownload = searchParams.get("download") === "true" || searchParams.get("dl") === "1";
  const filenameParam = searchParams.get("filename") || (path ? path.split("/").pop() : undefined);
  const rawCookie = searchParams.get("cookie") || req.cookies.get("terabox_ndus")?.value;
  const cookie = rawCookie ? formatNdusCookie(rawCookie) : "";

  // 1. Resolve dynamic dlink if not directly provided
  if (!mediaUrl) {
    mediaUrl = await resolveDirectDlink(path, fsId, cookie, shorturl);
  }

  // 2. If still no mediaUrl could be resolved
  if (!mediaUrl) {
    return NextResponse.json(
      {
        error: "Gagal mendapatkan streaming URL langsung dari TeraBox. Pastikan Cookie ndus aktif atau link publik masih valid.",
      },
      { status: 404 }
    );
  }

  // 3. Proxy the media stream from TeraBox CDN with robust fallback & safe Web Stream
  try {
    const rangeHeader = req.headers.get("range");

    // Strategy 1: Fetch with Cookie & Referer
    let mediaRes: Response | null = null;
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://dm.terabox.com/main",
      "Accept": "*/*",
    };
    if (cookie) fetchHeaders["Cookie"] = cookie;
    if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

    try {
      mediaRes = await fetch(mediaUrl, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(20000),
        redirect: "follow",
      });
    } catch {
      mediaRes = null;
    }

    // Strategy 2: If CDN returned 403/Forbidden (common when CDN doesn't accept cookies), retry without Cookie
    if (!mediaRes || (!mediaRes.ok && mediaRes.status !== 206)) {
      try {
        const cdnHeaders: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://www.terabox.app/",
          "Accept": "*/*",
        };
        if (rangeHeader) cdnHeaders["Range"] = rangeHeader;

        const retryRes = await fetch(mediaUrl, {
          headers: cdnHeaders,
          signal: AbortSignal.timeout(20000),
          redirect: "follow",
        });

        if (retryRes.ok || retryRes.status === 206) {
          mediaRes = retryRes;
        }
      } catch {
        // continue
      }
    }

    // Strategy 3: If still invalid and we have path/fsId/cookie, resolve a fresh dlink
    if (!mediaRes || (!mediaRes.ok && mediaRes.status !== 206)) {
      const freshDlink = await resolveDirectDlink(path, fsId, cookie, shorturl);
      if (freshDlink && freshDlink !== mediaUrl) {
        mediaUrl = freshDlink;
        try {
          const freshHeaders: Record<string, string> = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://dm.terabox.com/main",
            "Accept": "*/*",
          };
          if (cookie) freshHeaders["Cookie"] = cookie;
          if (rangeHeader) freshHeaders["Range"] = rangeHeader;

          const freshRes = await fetch(mediaUrl, {
            headers: freshHeaders,
            signal: AbortSignal.timeout(20000),
            redirect: "follow",
          });

          if (freshRes.ok || freshRes.status === 206) {
            mediaRes = freshRes;
          }
        } catch {
          // continue
        }
      }
    }

    if (!mediaRes || (!mediaRes.ok && mediaRes.status !== 206)) {
      return NextResponse.json(
        { error: "Gagal menghubungkan stream audio dari CDN TeraBox. Coba perbarui cookie ndus Anda." },
        { status: mediaRes?.status || 502 }
      );
    }

    const detectedMime = detectMimeType(filenameParam || path || "", mediaUrl, mediaRes.headers.get("content-type"));
    const contentLength = mediaRes.headers.get("content-length");
    const contentRange = mediaRes.headers.get("content-range");

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", detectedMime);
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Cache-Control", "public, max-age=7200");

    if (isDownload) {
      const cleanName = filenameParam ? filenameParam.replace(/"/g, "") : "download";
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${cleanName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`
      );
    }

    // Safe Web Stream Wrapper that completely eliminates ERR_INVALID_STATE (Controller is already closed)
    const reader = mediaRes.body?.getReader();
    const safeStream = new ReadableStream({
      async pull(controller) {
        if (!reader) {
          try { controller.close(); } catch {}
          return;
        }
        try {
          const { done, value } = await reader.read();
          if (done) {
            try { controller.close(); } catch {}
          } else {
            try { controller.enqueue(value); } catch {}
          }
        } catch {
          try { controller.close(); } catch {}
        }
      },
      async cancel(reason) {
        try {
          await reader?.cancel(reason);
        } catch {}
      },
    });

    return new NextResponse(safeStream, {
      status: mediaRes.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error saat proxy streaming media", details: error?.message },
      { status: 500 }
    );
  }
}
