import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Sample procedural audio has been disabled. Use live TeraBox streaming." }, { status: 404 });
}
