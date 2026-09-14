import { NextRequest, NextResponse } from "next/server";
import { formatNdusCookie } from "@/lib/teraboxParser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCookie = body.cookie || req.cookies.get("terabox_ndus")?.value;

    if (!rawCookie || !rawCookie.trim()) {
      return NextResponse.json({
        isValid: false,
        isExpired: false,
        status: "empty",
        message: "Nilai cookie ndus masih kosong.",
      });
    }

    const cleanCookie = formatNdusCookie(rawCookie);

    // Call TeraBox User & Drive status APIs
    const checkRes = await fetch(
      "https://dm.terabox.com/api/list?dir=%2F&order=time&desc=1&clienttype=0&app_id=250528&web=1&page=1&num=1",
      {
        headers: {
          "Cookie": cleanCookie,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://dm.terabox.com/main",
          "Accept": "application/json, text/plain, */*",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!checkRes.ok) {
      return NextResponse.json({
        isValid: false,
        isExpired: checkRes.status === 401 || checkRes.status === 403,
        status: "error",
        statusCode: checkRes.status,
        message: `TeraBox merespons dengan HTTP ${checkRes.status}.`,
      });
    }

    const data = await checkRes.json();

    if (data.errno === 0) {
      return NextResponse.json({
        isValid: true,
        isExpired: false,
        status: "valid",
        errno: 0,
        message: "Token Cookie ndus Anda VALID dan aktif! Siap digunakan untuk streaming & inspect drive.",
      });
    }

    if (data.errno === -6) {
      return NextResponse.json({
        isValid: false,
        isExpired: true,
        status: "expired",
        errno: -6,
        message: "Cookie ndus sudah KEDALUWARSA atau sesi login telah berakhir (TeraBox errno: -6). Silakan login ulang ke terabox.com dan ambil cookie ndus terbaru.",
      });
    }

    return NextResponse.json({
      isValid: false,
      isExpired: false,
      status: "unknown",
      errno: data.errno,
      message: `TeraBox mengembalikan kode errno: ${data.errno}. Token mungkin tidak memiliki izin penuh.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        isValid: false,
        isExpired: false,
        status: "network_error",
        message: "Gagal menghubungi server TeraBox untuk verifikasi token: " + (error?.message || String(error)),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCookie = searchParams.get("cookie") || req.cookies.get("terabox_ndus")?.value;

  if (!rawCookie) {
    return NextResponse.json({
      isValid: false,
      isExpired: false,
      status: "empty",
      message: "Parameter cookie wajib diisi",
    });
  }

  const cleanCookie = formatNdusCookie(rawCookie);
  try {
    const checkRes = await fetch(
      "https://dm.terabox.com/api/list?dir=%2F&clienttype=0&app_id=250528&web=1&page=1&num=1",
      {
        headers: {
          "Cookie": cleanCookie,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://dm.terabox.com/main",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    const data = await checkRes.json();
    const isValid = data.errno === 0;
    const isExpired = data.errno === -6;

    return NextResponse.json({
      isValid,
      isExpired,
      status: isValid ? "valid" : isExpired ? "expired" : "unknown",
      errno: data.errno,
      message: isValid
        ? "Cookie ndus VALID"
        : isExpired
        ? "Cookie ndus KEDALUWARSA (errno: -6)"
        : `Errno: ${data.errno}`,
    });
  } catch (e: any) {
    return NextResponse.json({ isValid: false, isExpired: false, status: "error", message: e?.message }, { status: 500 });
  }
}
