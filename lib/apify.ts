// Server-side Apify client for the starvibe/youtube-video-transcript actor.
// The user's Apify token is supplied per-request (stored in their browser) and
// is never persisted on the server — we only proxy it to Apify.

const ACTOR = "starvibe~youtube-video-transcript";

export interface ApifyVideo {
  transcript: string;
  title?: string;
  channel?: string;
  channel_id?: string;
  duration?: number;
  view_count?: number;
  upload_date?: string; // YYYYMMDD
  video_id?: string;
  status?: string;
  message?: string;
}

interface ApifyItem {
  transcript_text?: string;
  transcript?: Array<{ text?: string }>;
  title?: string;
  channel_name?: string;
  channel_id?: string;
  duration_seconds?: number;
  view_count?: number;
  published_at?: string;
  video_id?: string;
  status?: string;
  message?: string;
}

export class ApifyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Runs the actor synchronously for a single video and returns the transcript +
// metadata. Throws ApifyError on auth/credit/HTTP failures so callers can show
// a useful message.
export async function fetchApifyTranscript(token: string, youtubeUrl: string): Promise<ApifyVideo | null> {
  const endpoint = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtube_url: youtubeUrl, include_transcript_text: true }),
    });
  } catch (e) {
    throw new ApifyError(502, `Could not reach Apify: ${String((e as Error).message || e)}`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.message || "";
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new ApifyError(401, "Invalid Apify API token.");
    if (res.status === 402) throw new ApifyError(402, "Apify account is out of credit.");
    throw new ApifyError(res.status, detail || `Apify request failed (${res.status}).`);
  }

  const items = (await res.json()) as ApifyItem[];
  const item = Array.isArray(items) ? items[0] : null;
  if (!item) return null;

  const transcript =
    item.transcript_text ||
    (Array.isArray(item.transcript) ? item.transcript.map((t) => t.text ?? "").join(" ").replace(/\s+/g, " ").trim() : "") ||
    "";

  return {
    transcript,
    title: item.title,
    channel: item.channel_name,
    channel_id: item.channel_id,
    duration: item.duration_seconds,
    view_count: item.view_count,
    upload_date: item.published_at ? String(item.published_at).slice(0, 10).replace(/-/g, "") : undefined,
    video_id: item.video_id,
    status: item.status,
    message: item.message,
  };
}
