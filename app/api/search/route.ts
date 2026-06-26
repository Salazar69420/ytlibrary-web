import { NextRequest, NextResponse } from "next/server";

const YT_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240101.00.00",
    hl: "en",
    gl: "US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
};

// Public InnerTube key embedded in YouTube's own web client
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseViews(text: string): number {
  if (!text) return 0;
  const m = text.replace(/,/g, "").match(/([\d.]+)\s*([MKB]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult: Record<string, number> = { M: 1_000_000, K: 1_000, B: 1_000_000_000 };
  return Math.round(n * (mult[m[2].toUpperCase()] ?? 1));
}

function extractVideos(data: Record<string, unknown>) {
  const results: unknown[] = [];

  const sections =
    (
      (
        (data?.contents as Record<string, unknown>)
          ?.twoColumnSearchResultsRenderer as Record<string, unknown>
      )?.primaryContents as Record<string, unknown>
    )?.sectionListRenderer as Record<string, unknown>;

  const contents = (sections?.contents as unknown[]) ?? [];

  for (const section of contents) {
    const s = section as Record<string, unknown>;
    const items =
      ((s?.itemSectionRenderer as Record<string, unknown>)?.contents as unknown[]) ?? [];

    for (const item of items) {
      const vr = (item as Record<string, unknown>)?.videoRenderer as Record<string, unknown>;
      if (!vr?.videoId) continue;

      const id = vr.videoId as string;
      const thumbs = ((vr.thumbnail as Record<string, unknown>)?.thumbnails as Array<{
        url: string;
        width?: number;
      }>) ?? [];

      const thumb =
        thumbs.length > 0
          ? thumbs[thumbs.length - 1].url.split("?")[0]
          : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      const titleRuns = ((vr.title as Record<string, unknown>)?.runs as Array<{
        text: string;
      }>) ?? [];
      const title =
        titleRuns[0]?.text ?? (vr.title as Record<string, unknown>)?.simpleText ?? "";

      const bylineRuns = (
        ((vr.longBylineText as Record<string, unknown>)?.runs as Array<{
          text: string;
          navigationEndpoint?: Record<string, unknown>;
        }>) ?? []
      );
      const channel = bylineRuns[0]?.text ?? "";
      const channelId =
        ((bylineRuns[0]?.navigationEndpoint as Record<string, unknown>)
          ?.browseEndpoint as Record<string, unknown>)?.browseId ?? "";

      const viewText =
        (vr.viewCountText as Record<string, unknown>)?.simpleText ??
        ((vr.viewCountText as Record<string, unknown>)?.runs as Array<{ text: string }>)
          ?.map((r) => r.text)
          .join("") ??
        "";

      results.push({
        video_id: id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title,
        channel,
        channel_id: channelId,
        thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        hq_thumbnail: thumb,
        duration: parseDuration(
          ((vr.lengthText as Record<string, unknown>)?.simpleText as string) ?? ""
        ),
        view_count: parseViews(viewText as string),
        published_text:
          ((vr.publishedTimeText as Record<string, unknown>)?.simpleText as string) ?? "",
        upload_date: "",
      });
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: YT_CONTEXT, query }),
      }
    );

    if (!res.ok) throw new Error(`InnerTube ${res.status}`);
    const data = await res.json();
    const videos = extractVideos(data);
    return NextResponse.json({ videos });
  } catch {
    // Fallback: scrape search page
    try {
      const html = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        }
      ).then((r) => r.text());

      const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/);
      if (!m) return NextResponse.json({ error: "Could not parse results" }, { status: 502 });

      const data = JSON.parse(m[1]);
      const videos = extractVideos(data);
      return NextResponse.json({ videos });
    } catch (e) {
      return NextResponse.json({ error: "Search failed", detail: String(e) }, { status: 500 });
    }
  }
}
