import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, getPlayerData } from "@/lib/youtube";
import { fetchApifyTranscript } from "@/lib/apify";

export async function POST(req: NextRequest) {
  const { url, apifyToken } = await req.json();
  const video_id = extractVideoId(url ?? "");
  if (!video_id) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }
  const canonical = `https://www.youtube.com/watch?v=${video_id}`;

  let title: string | undefined;
  let channel: string | undefined;
  let channel_id = "";
  let duration = 0;
  let view_count = 0;
  let upload_date = "";
  let transcript = "";

  // Preferred path: Apify actor gives the transcript AND reliable metadata.
  if (apifyToken) {
    try {
      const a = await fetchApifyTranscript(apifyToken, canonical);
      if (a) {
        transcript = a.transcript || "";
        title = a.title || title;
        channel = a.channel || channel;
        channel_id = a.channel_id || channel_id;
        duration = a.duration || duration;
        view_count = a.view_count || view_count;
        upload_date = a.upload_date || upload_date;
      }
    } catch {
      // Fall through to the metadata-only path below; transcript stays empty.
    }
  }

  // Fill any gaps (no token, or Apify missing fields) via player data + oEmbed.
  if (!title || !channel) {
    const player = await getPlayerData(video_id);
    title = title || player.title;
    channel = channel || player.channel;
    channel_id = channel_id || player.channelId || "";
    duration = duration || player.durationSeconds || 0;
    view_count = view_count || player.viewCount || 0;
    upload_date = upload_date || player.uploadDate || "";

    if (!title || !channel) {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      title = title || oembed?.title || "Unknown";
      channel = channel || oembed?.author_name || "Unknown";
    }
  }

  return NextResponse.json({
    video_id,
    url: canonical,
    title,
    channel,
    channel_id,
    thumbnail_url: `https://i.ytimg.com/vi/${video_id}/maxresdefault.jpg`,
    upload_date,
    duration,
    view_count,
    transcript,
    added_at: new Date().toISOString(),
  });
}
