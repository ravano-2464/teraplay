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

  // 1. Resolve dynamic dlink from TeraBox Private Drive if (path or fsId) and Cookie are provided
  if (!mediaUrl && cookie && (path || fsId)) {
    const privateEndpoints: string[] = [];

    // Prioritize target path which is the most reliable endpoint on dm.terabox.com
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
      if (mediaUrl) break;
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
          if (found) {
            mediaUrl = found;
          }
        }
      } catch (e: any) {
        // continue to next endpoint
      }
    }
  }

  // 2. Resolve dynamic dlink from Public Share
  if (!mediaUrl && fsId && shorturl) {
    const cleanSurl = shorturl.replace(/^1/, "");
    const publicEndpoints = [
      `https://www.terabox.app/share/download?app_id=250528&shorturl=${cleanSurl}&fs_id=${fsId}`,
      `https://www.1024tera.com/share/download?app_id=250528&shorturl=${cleanSurl}&fs_id=${fsId}`,
      `https://www.terabox.com/api/share/download?app_id=250528&shorturl=${cleanSurl}&fs_id=${fsId}`,
      `https://www.terabox.app/api/share/download?app_id=250528&shorturl=${cleanSurl}&fid_list=[${fsId}]`,
    ];

    for (const ep of publicEndpoints) {
      if (mediaUrl) break;
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
          if (found) {
            mediaUrl = found;
          }
        }
      } catch (e: any) {
        // continue
      }
    }
  }

  // 3. If no mediaUrl could be resolved
  if (!mediaUrl) {
    return NextResponse.json(
      {
        error: "Gagal mendapatkan streaming URL langsung dari TeraBox. Pastikan Cookie ndus aktif atau link publik masih valid.",
      },
      { status: 404 }
    );
  }

  // 4. Proxy the media stream from TeraBox CDN with HTTP Byte-Range support
  try {
    const rangeHeader = req.headers.get("range");
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://dm.terabox.com/main",
      "Accept": "*/*",
    };

    if (cookie) {
      headers["Cookie"] = cookie;
    }

    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const mediaRes = await fetch(mediaUrl, {
      headers,
      signal: AbortSignal.timeout(25000),
      redirect: "follow",
    });

    if (!mediaRes.ok && mediaRes.status !== 206) {
      return NextResponse.redirect(mediaUrl);
    }

    let contentType = mediaRes.headers.get("content-type") || "audio/mpeg";
    if (path?.endsWith(".mp4") || mediaUrl.includes(".mp4")) {
      contentType = "video/mp4";
    } else if (path?.endsWith(".mp3") || mediaUrl.includes(".mp3")) {
      contentType = "audio/mpeg";
    } else if (path?.endsWith(".wav") || mediaUrl.includes(".wav")) {
      contentType = "audio/wav";
    }

    const contentLength = mediaRes.headers.get("content-length");
    const contentRange = mediaRes.headers.get("content-range");

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "public, max-age=7200");

    if (isDownload) {
      const cleanName = filenameParam ? filenameParam.replace(/"/g, "") : "download";
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${cleanName}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`
      );
    }

    // Safe stream pipe that handles client cancellation without unhandledRejection
    const { readable, writable } = new TransformStream();
    if (mediaRes.body) {
      mediaRes.body.pipeTo(writable).catch(() => {
        // Gracefully ignore client connection close / abort
      });
    }

    return new NextResponse(readable, {
      status: mediaRes.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.redirect(mediaUrl);
  }
}
