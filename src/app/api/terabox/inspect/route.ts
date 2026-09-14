import { NextRequest, NextResponse } from "next/server";
import { resolveTeraBoxFolder } from "@/lib/teraboxParser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url;
    const cookie = body.cookie || req.cookies.get("terabox_ndus")?.value;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL link TeraBox wajib diisi." },
        { status: 400 }
      );
    }

    const result = await resolveTeraBoxFolder(url, cookie);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error inspecting TeraBox link:", error);
    return NextResponse.json(
      {
        error: "Gagal memproses link TeraBox. Pastikan format URL valid.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const cookie = searchParams.get("cookie") || req.cookies.get("terabox_ndus")?.value;

  if (!url) {
    return NextResponse.json(
      { error: "Parameter url wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const result = await resolveTeraBoxFolder(url, cookie);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memproses link", details: error?.message },
      { status: 500 }
    );
  }
}
