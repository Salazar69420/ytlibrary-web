"use client";
import { useState } from "react";
import { Search, Loader2, Plus, Check, Clock, Eye } from "lucide-react";
import { saveVideo } from "@/lib/db";
import { formatDuration, formatViews, cn } from "@/lib/utils";

interface Result {
  video_id: string;
  url: string;
  title: string;
  channel: string;
  channel_id?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count?: number;
  published_text?: string;
}

export default function SearchView({ onImported }: { onImported: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResults([]);
    setSearched(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.videos ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (video: Result) => {
    if (importing.has(video.video_id) || imported.has(video.video_id)) return;
    setImporting((p) => new Set(p).add(video.video_id));
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.url }),
      });
      if (res.ok) {
        const data = await res.json();
        await saveVideo(data);
        setImported((p) => new Set(p).add(video.video_id));
        onImported();
      }
    } finally {
      setImporting((p) => { const n = new Set(p); n.delete(video.video_id); return n; });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube…"
              className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm text-[#f2f2f7] placeholder-subtle focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dim disabled:opacity-40 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-subtle">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm">Searching YouTube…</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center h-64 text-subtle gap-3">
            <Search size={40} className="opacity-20" />
            <p className="text-sm">Type above to search YouTube</p>
            <p className="text-xs text-muted">Tap Import on any result to save it</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex items-center justify-center h-48 text-subtle text-sm">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {results.length > 0 && (
          <div className="p-4">
            <p className="text-xs text-subtle mb-3">{results.length} results</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {results.map((v) => (
                <SearchCard
                  key={v.video_id}
                  video={v}
                  isImported={imported.has(v.video_id)}
                  isImporting={importing.has(v.video_id)}
                  onImport={() => handleImport(v)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchCard({ video, isImported, isImporting, onImport }: {
  video: Result;
  isImported: boolean;
  isImporting: boolean;
  onImport: () => void;
}) {
  const [err, setErr] = useState(false);
  const thumb = !err && video.thumbnail_url
    ? video.thumbnail_url
    : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden animate-fade-in">
      <div className="relative aspect-video bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt={video.title} onError={() => setErr(true)}
          className="w-full h-full object-cover" loading="lazy" />
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {isImported && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-success rounded-full p-1.5"><Check size={16} className="text-black" /></div>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <p className="text-[12px] font-medium text-[#f2f2f7] clamp-2 leading-snug">{video.title}</p>
        <p className="text-[11px] text-subtle truncate">{video.channel}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          {video.view_count ? <span className="flex items-center gap-0.5"><Eye size={9} />{formatViews(video.view_count)}</span> : null}
          {video.published_text ? <span className="flex items-center gap-0.5"><Clock size={9} />{video.published_text}</span> : null}
        </div>
        <button
          onClick={onImport}
          disabled={isImported || isImporting}
          className={cn(
            "mt-auto w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-xl font-semibold transition-all duration-150",
            isImported
              ? "bg-success/15 text-success cursor-default"
              : isImporting
              ? "bg-hover text-dim cursor-wait"
              : "bg-primary/15 hover:bg-primary text-primary hover:text-white active:scale-95"
          )}
        >
          {isImporting ? <Loader2 size={11} className="animate-spin" /> : isImported ? <Check size={11} /> : <Plus size={11} />}
          {isImported ? "Saved" : isImporting ? "Saving…" : "Import"}
        </button>
      </div>
    </div>
  );
}
