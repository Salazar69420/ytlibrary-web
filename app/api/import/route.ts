import { NextRequest, NextResponse } from "next/server";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}


export async function POST(req: NextRequest) {
  const { url } = await req.json();
  const video_id = extractVideoId(url ?? "");
  if (!video_id) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  // Try oEmbed first (no API key needed)
  const oembed = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${video_id}&format=json`
  ).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  if (!oembed) {
    return NextResponse.json({ error: "Could not fetch video info" }, { status: 502 });
  }

  // Try to get extra info from YouTube's public API (no key needed for basic info)
  let view_count = 0;
  let upload_date = "";
  let channel_id = "";
  let duration = 0;

  const ytPage = await fetch(`https://www.youtube.com/watch?v=${video_id}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }).then((r) => (r.ok ? r.text() : null)).catch(() => null);

  if (ytPage) {
    const viewMatch = ytPage.match(/"viewCount":"(\d+)"/);
    if (viewMatch) view_count = parseInt(viewMatch[1]);

    const dateMatch = ytPage.match(/"uploadDate":"([^"]+)"/);
    if (dateMatch) upload_date = dateMatch[1].replace(/-/g, "");

    const channelMatch = ytPage.match(/"channelId":"([^"]+)"/);
    if (channelMatch) channel_id = channelMatch[1];

    const durMatch = ytPage.match(/"approxDurationMs":"(\d+)"/);
    if (durMatch) duration = Math.round(parseInt(durMatch[1]) / 1000);
  }

  return NextResponse.json({
    video_id,
    url: `https://www.youtube.com/watch?v=${video_id}`,
    title: oembed.title ?? "Unknown",
    channel: oembed.author_name ?? "Unknown",
    channel_id,
    thumbnail_url: `https://i.ytimg.com/vi/${video_id}/maxresdefault.jpg`,
    upload_date,
    duration,
    view_count,
    added_at: new Date().toISOString(),
  });
}
