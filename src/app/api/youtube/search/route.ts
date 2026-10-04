import { NextRequest, NextResponse } from "next/server";
import { searchYouTube, resolveBestYouTubeTrack, cleanSearchQuery } from "@/lib/youtubeSearch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || searchParams.get("query") || "";
  const filename = searchParams.get("filename") || "";
  const artist = searchParams.get("artist") || undefined;
  const bestOnly = searchParams.get("best") === "true";

  const targetQuery = q || cleanSearchQuery(filename, artist);

  if (!targetQuery) {
    return NextResponse.json(
      { error: "Parameter q atau filename diperlukan." },
      { status: 400 }
    );
  }

  try {
    if (bestOnly) {
      const best = await resolveBestYouTubeTrack(filename || targetQuery, artist);
      if (!best) {
        return NextResponse.json({ success: false, error: "Lagu tidak ditemukan di YouTube." }, { status: 404 });
      }
      return NextResponse.json({ success: true, track: best });
    }

    const results = await searchYouTube(targetQuery, 5);
    return NextResponse.json({ success: true, query: targetQuery, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Gagal mencari di YouTube", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const q = body.query || body.q || "";
    const filename = body.filename || "";
    const artist = body.artist || undefined;
    const bestOnly = body.bestOnly === true;

    const targetQuery = q || cleanSearchQuery(filename, artist);

    if (!targetQuery) {
      return NextResponse.json(
        { error: "Field query atau filename diperlukan." },
        { status: 400 }
      );
    }

    if (bestOnly) {
      const best = await resolveBestYouTubeTrack(filename || targetQuery, artist);
      if (!best) {
        return NextResponse.json({ success: false, error: "Lagu tidak ditemukan di YouTube." }, { status: 404 });
      }
      return NextResponse.json({ success: true, track: best });
    }

    const results = await searchYouTube(targetQuery, 5);
    return NextResponse.json({ success: true, query: targetQuery, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Gagal memproses pencarian YouTube", details: error?.message },
      { status: 500 }
    );
  }
}
