"use client";
import { useState } from "react";
import { Search, Loader2, Plus, Check, Clock, Eye } from "lucide-react";
import { saveVideo } from "@/lib/db";
import { formatDuration, formatViews } from "@/lib/utils";

interface SearchResult {
  video_id: string;
  url: string;
  title: string;
  channel: string;
  channel_id?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count?: number;
  published_text?: string;
  upload_date?: string;
}

interface Props {
  onImported: () => void;
}

export default function SearchView({ onImported }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const handleImport = async (video: SearchResult) => {
    if (importing.has(video.video_id) || imported.has(video.video_id)) return;
    setImporting((prev) => new Set(prev).add(video.video_id));
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.url }),
      });
      const data = await res.json();
      if (res.ok) {
        await saveVideo(data);
        setImported((prev) => new Set(prev).add(video.video_id));
        onImported();
      }
    } finally {
      setImporting((prev) => {
        const next = new Set(prev);
        next.delete(video.video_id);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar */}
      <div className="shrink-0 p-3 sm:p-4 border-b border-surface-border bg-surface-raised">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube…"
              className="w-full pl-9 pr-3 py-2.5 bg-surface-card border border-surface-border rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
        {error && <p className="text-xs text-red-400 mt-2 px-1">{error}</p>}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {loading && (
          <div className="flex items-center justify-center h-40 gap-2 text-gray-500 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Searching YouTube…
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
            No results found for &quot;{query}&quot;
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
            <Search size={36} className="opacity-20" />
            <p className="text-sm">Search YouTube to find and import videos</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-3">{results.length} results for &quot;{query}&quot;</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {results.map((video) => (
                <SearchCard
                  key={video.video_id}
                  video={video}
                  isImported={imported.has(video.video_id)}
                  isImporting={importing.has(video.video_id)}
                  onImport={() => handleImport(video)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SearchCard({
  video,
  isImported,
  isImporting,
  onImport,
}: {
  video: SearchResult;
  isImported: boolean;
  isImporting: boolean;
  onImport: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumb = !imgError && video.thumbnail_url
    ? video.thumbnail_url
    : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div className="flex flex-col bg-surface-card border border-surface-border rounded-xl overflow-hidden">
      <div className="relative aspect-video bg-surface-raised shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={video.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {isImported && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Check size={24} className="text-green-400" />
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="text-xs font-medium text-gray-100 line-clamp-2 leading-snug">{video.title}</p>
        <p className="text-[11px] text-gray-500 truncate">{video.channel}</p>

        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600">
          {video.view_count ? (
            <span className="flex items-center gap-0.5">
              <Eye size={9} />
              {formatViews(video.view_count)}
            </span>
          ) : null}
          {video.published_text ? (
            <span className="flex items-center gap-0.5">
              <Clock size={9} />
              {video.published_text}
            </span>
          ) : null}
        </div>

        <button
          onClick={onImport}
          disabled={isImported || isImporting}
          className={`mt-auto w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors font-medium ${
            isImported
              ? "bg-green-900/20 text-green-400 cursor-default border border-green-800/30"
              : isImporting
              ? "bg-surface-hover text-gray-400 cursor-wait"
              : "bg-brand/20 hover:bg-brand text-blue-400 hover:text-white border border-brand/30 hover:border-transparent"
          }`}
        >
          {isImporting ? (
            <Loader2 size={11} className="animate-spin" />
          ) : isImported ? (
            <Check size={11} />
          ) : (
            <Plus size={11} />
          )}
          {isImported ? "Saved to Library" : isImporting ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}
