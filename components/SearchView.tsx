"use client";
import { useState } from "react";
import { Search, Loader2, Plus, Check, Clock, Eye, X, Download } from "lucide-react";
import { saveVideo } from "@/lib/db";
import { getApifyToken } from "@/lib/settings";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResults([]);
    setSelected(new Set());
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

  // Import a single video; returns true on success.
  const importOne = async (video: Result): Promise<boolean> => {
    if (importing.has(video.video_id) || imported.has(video.video_id)) return false;
    setImporting((p) => new Set(p).add(video.video_id));
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.url, apifyToken: getApifyToken() }),
      });
      if (res.ok) {
        const data = await res.json();
        await saveVideo(data);
        setImported((p) => new Set(p).add(video.video_id));
        onImported();
        return true;
      }
      return false;
    } finally {
      setImporting((p) => { const n = new Set(p); n.delete(video.video_id); return n; });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchImport = async () => {
    const queue = results.filter((v) => selected.has(v.video_id) && !imported.has(v.video_id));
    if (queue.length === 0) return;
    setBatchBusy(true);
    setBatchDone(0);
    for (const v of queue) {
      await importOne(v);
      setBatchDone((n) => n + 1);
    }
    setBatchBusy(false);
    setSelected(new Set());
  };

  const selectableCount = results.filter((v) => !imported.has(v.video_id)).length;
  const allSelected = selectableCount > 0 && results.every((v) => imported.has(v.video_id) || selected.has(v.video_id));
  const toggleSelectAll = () => {
    if (allSelected) { setSelected(new Set()); return; }
    setSelected(new Set(results.filter((v) => !imported.has(v.video_id)).map((v) => v.video_id)));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-surface">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube…"
              className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm text-text placeholder-subtle focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dim disabled:opacity-40 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 active:scale-[0.98]"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}

        {/* Batch toolbar */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mt-3 text-xs">
            <span className="text-subtle">{results.length} results</span>
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1 text-subtle hover:text-text transition-colors"
            >
              <Check size={12} />
              {allSelected ? "Clear selection" : "Select all"}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading && (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="aspect-video skeleton" />
                  <div className="p-2.5 flex flex-col gap-2">
                    <div className="h-3 rounded skeleton" />
                    <div className="h-3 w-2/3 rounded skeleton" />
                    <div className="h-6 rounded-xl skeleton mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center h-64 text-subtle gap-3 px-6 text-center">
            <Search size={40} className="opacity-20" />
            <p className="text-sm">Search YouTube to build your library</p>
            <p className="text-xs text-muted">Select multiple results and import them all at once</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="flex items-center justify-center h-48 text-subtle text-sm">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {results.length > 0 && (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-fade-in">
              {results.map((v) => (
                <SearchCard
                  key={v.video_id}
                  video={v}
                  isImported={imported.has(v.video_id)}
                  isImporting={importing.has(v.video_id)}
                  isSelected={selected.has(v.video_id)}
                  onToggleSelect={() => toggleSelect(v.video_id)}
                  onImport={() => importOne(v)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Batch import floating bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up px-2">
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur border border-border rounded-2xl shadow-float px-2.5 py-2">
            <button
              onClick={() => setSelected(new Set())}
              disabled={batchBusy}
              className="p-1.5 text-subtle hover:text-text rounded-lg hover:bg-hover transition-colors disabled:opacity-40"
            >
              <X size={16} />
            </button>
            <span className="text-sm font-semibold text-text px-0.5 whitespace-nowrap tabular-nums">
              {selected.size} selected
            </span>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={handleBatchImport}
              disabled={batchBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dim text-white text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-70 whitespace-nowrap"
            >
              {batchBusy
                ? <><Loader2 size={13} className="animate-spin" /> Importing {batchDone}/{selected.size}…</>
                : <><Download size={13} /> Import {selected.size} selected</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchCard({ video, isImported, isImporting, isSelected, onToggleSelect, onImport }: {
  video: Result;
  isImported: boolean;
  isImporting: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onImport: () => void;
}) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const thumb = !err && video.thumbnail_url
    ? video.thumbnail_url
    : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div className={cn(
      "flex flex-col bg-card border rounded-2xl overflow-hidden animate-fade-in shadow-card transition-all duration-150 ease-out-soft",
      isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-muted"
    )}>
      <div
        className="relative aspect-video bg-surface cursor-pointer"
        onClick={() => !isImported && onToggleSelect()}
      >
        {!loaded && <div className="absolute inset-0 skeleton" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt={video.title} onError={() => { setErr(true); setLoaded(true); }}
          onLoad={() => setLoaded(true)}
          className={cn("w-full h-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")} loading="lazy" />
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {/* Select checkbox */}
        {!isImported && (
          <div className={cn(
            "absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ease-out-soft",
            isSelected ? "bg-primary border-primary scale-110" : "bg-black/50 border-white/70 backdrop-blur-sm"
          )}>
            {isSelected && <Check size={11} className="text-white animate-pop-in" strokeWidth={3} />}
          </div>
        )}
        {isImported && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-success rounded-full p-1.5"><Check size={16} className="text-black" /></div>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <p className="text-[12px] font-medium text-text clamp-2 leading-snug">{video.title}</p>
        <p className="text-[11px] text-subtle truncate">{video.channel}</p>
        <div className="flex items-center gap-2 text-[10px] text-dim">
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
