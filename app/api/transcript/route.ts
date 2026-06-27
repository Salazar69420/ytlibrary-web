import { NextRequest, NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchApifyTranscript, ApifyError } from "@/lib/apify";

// Backfill endpoint: fetch a transcript for an already-saved video via Apify.
export async function POST(req: NextRequest) {
  const { video_id, url, apifyToken } = await req.json();
  const id = video_id || extractVideoId(url ?? "");
  if (!id) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }
  if (!apifyToken) {
    return NextResponse.json(
      { error: "No Apify token configured", needsToken: true },
      { status: 400 }
    );
  }

  try {
    const data = await fetchApifyTranscript(apifyToken, `https://www.youtube.com/watch?v=${id}`);
    const transcript = data?.transcript ?? "";
    return NextResponse.json({
      transcript,
      available: transcript.length > 0,
      status: data?.status,
      message: data?.message,
    });
  } catch (e) {
    const err = e as ApifyError;
    return NextResponse.json(
      { error: err.message || "Transcript fetch failed" },
      { status: err.status || 502 }
    );
  }
}
