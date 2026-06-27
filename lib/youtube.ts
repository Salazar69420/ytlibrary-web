// Server-side YouTube helpers: metadata + transcript (captions) fetching.
// Uses only fetch + string parsing so it runs in the Next.js route runtime.
// Best-effort: YouTube has no public captions API, so we read the same data
// the web player uses (ytInitialPlayerResponse / InnerTube player endpoint).

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

const WEB_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240101.00.00",
    hl: "en",
    gl: "US",
  },
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const COMMON_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
};

export interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string; // "asr" for auto-generated
}

export interface PlayerData {
  title?: string;
  channel?: string;
  channelId?: string;
  durationSeconds?: number;
  viewCount?: number;
  uploadDate?: string; // YYYYMMDD
  captionTracks?: CaptionTrack[];
}

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // Bare 11-char id
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// Extract a balanced JSON object that follows `marker` in `html`.
function extractJsonAfter(html: string, marker: string): Record<string, unknown> | null {
  const i = html.indexOf(marker);
  if (i === -1) return null;
  const start = html.indexOf("{", i);
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function captionTracksOf(player: Record<string, unknown> | null): CaptionTrack[] {
  const captions = (player?.captions as Record<string, unknown>)
    ?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
  return ((captions?.captionTracks as CaptionTrack[]) ?? []).filter((t) => t?.baseUrl);
}

async function getPlayerViaWatchPage(videoId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers: COMMON_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    return extractJsonAfter(html, "ytInitialPlayerResponse");
  } catch {
    return null;
  }
}

async function getPlayerViaInnertube(videoId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...COMMON_HEADERS },
      body: JSON.stringify({ context: WEB_CONTEXT, videoId }),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getPlayerData(videoId: string): Promise<PlayerData> {
  // Prefer the watch page (works reliably in most environments); fall back to
  // the InnerTube player endpoint, and merge captions from whichever has them.
  let player = await getPlayerViaWatchPage(videoId);
  if (!player || captionTracksOf(player).length === 0) {
    const alt = await getPlayerViaInnertube(videoId);
    if (alt) {
      if (!player) player = alt;
      else if (captionTracksOf(player).length === 0 && captionTracksOf(alt).length > 0) {
        player.captions = alt.captions;
      }
      if (!player.videoDetails && alt.videoDetails) player.videoDetails = alt.videoDetails;
      if (!player.microformat && alt.microformat) player.microformat = alt.microformat;
    }
  }
  if (!player) return {};

  const vd = (player.videoDetails as Record<string, unknown>) ?? {};
  const mf = ((player.microformat as Record<string, unknown>)?.playerMicroformatRenderer as Record<string, unknown>) ?? {};
  const uploadRaw = (mf.publishDate as string) || (mf.uploadDate as string) || "";

  return {
    title: (vd.title as string) || undefined,
    channel: (vd.author as string) || undefined,
    channelId: (vd.channelId as string) || undefined,
    durationSeconds: vd.lengthSeconds ? parseInt(vd.lengthSeconds as string, 10) || undefined : undefined,
    viewCount: vd.viewCount ? parseInt(vd.viewCount as string, 10) || undefined : undefined,
    uploadDate: uploadRaw ? uploadRaw.slice(0, 10).replace(/-/g, "") : undefined,
    captionTracks: captionTracksOf(player),
  };
}

function pickTrack(tracks: CaptionTrack[]): CaptionTrack | undefined {
  return (
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks.find((t) => t.kind !== "asr") ||
    tracks[0]
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function parseXmlTranscript(xml: string): string {
  const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  if (matches.length === 0) return "";
  return matches
    .map((m) => decodeEntities(m[1].replace(/\n/g, " ")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJson3Transcript(text: string): string {
  const j = JSON.parse(text) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
  const lines = (j.events ?? [])
    .filter((e) => e.segs)
    .map((e) => (e.segs ?? []).map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function withJson3(baseUrl: string): string {
  if (/[?&]fmt=/.test(baseUrl)) return baseUrl.replace(/([?&])fmt=[^&]*/, "$1fmt=json3");
  return baseUrl + (baseUrl.includes("?") ? "&" : "?") + "fmt=json3";
}

async function fetchTrackText(baseUrl: string): Promise<string> {
  // Try json3 (cleanest, already entity-decoded)
  try {
    const res = await fetch(withJson3(baseUrl), { headers: COMMON_HEADERS });
    if (res.ok) {
      const text = await res.text();
      try {
        const out = parseJson3Transcript(text);
        if (out) return out;
      } catch {
        const xml = parseXmlTranscript(text);
        if (xml) return xml;
      }
    }
  } catch {
    /* fall through */
  }
  // Fallback: raw track (XML / srv*)
  try {
    const res = await fetch(baseUrl, { headers: COMMON_HEADERS });
    if (res.ok) {
      const out = parseXmlTranscript(await res.text());
      if (out) return out;
    }
  } catch {
    /* give up */
  }
  return "";
}

// Returns the transcript text, or "" if the video has no captions / fetch fails.
export async function fetchTranscript(videoId: string, tracks?: CaptionTrack[]): Promise<string> {
  let captionTracks = tracks;
  if (!captionTracks || captionTracks.length === 0) {
    captionTracks = (await getPlayerData(videoId)).captionTracks;
  }
  if (!captionTracks || captionTracks.length === 0) return "";
  const track = pickTrack(captionTracks);
  if (!track?.baseUrl) return "";
  return fetchTrackText(track.baseUrl);
}
