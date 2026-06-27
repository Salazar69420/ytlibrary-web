"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Library, Brain, Search, Plus, Download, Upload,
  Menu, X, ChevronLeft, CheckSquare,
} from "lucide-react";
import VideoCard from "@/components/VideoCard";
import SearchView from "@/components/SearchView";
import DetailPanel from "@/components/DetailPanel";
import BrainView from "@/components/BrainView";
import SelectionBar from "@/components/SelectionBar";
import ImportModal from "@/components/ImportModal";
import CreateBrainModal from "@/components/CreateBrainModal";
import {
  getVideos, getChannels, getTags, getBrains, getVideoTags,
  deleteBrain, exportAllData, importAllData,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Video, Tag, Brain as BrainType } from "@/lib/types";

type Tab = "library" | "search" | "brains";
type Filter = { type: "channel" | "tag"; name: string } | null;

export default function Home() {
  const [videos, setVideos]       = useState<Video[]>([]);
  const [vtags, setVtags]         = useState<Record<string, string[]>>({});
  const [channels, setChannels]   = useState<string[]>([]);
  const [tags, setTags]           = useState<Tag[]>([]);
  const [brains, setBrains]       = useState<(BrainType & { video_count: number })[]>([]);

  const [tab, setTab]             = useState<Tab>("library");
  const [filter, setFilter]       = useState<Filter>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [brainId, setBrainId]     = useState<number | null>(null);

  const [detail, setDetail]       = useState<Video | null>(null);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [showNewBrain, setShowNewBrain] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastIndexRef = useRef<number | null>(null);

  // ── data loading ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [vids, chs, tgs, brs] = await Promise.all([
      getVideos({
        channel: filter?.type === "channel" ? filter.name : undefined,
        tag: filter?.type === "tag" ? filter.name : undefined,
        search: librarySearch || undefined,
      }),
      getChannels(), getTags(), getBrains(),
    ]);
    setVideos(vids);
    setChannels(chs);
    setTags(tgs);
    setBrains(brs);

    const tm: Record<string, string[]> = {};
    await Promise.all(vids.map(async (v) => { tm[v.video_id] = await getVideoTags(v.video_id); }));
    setVtags(tm);
  }, [filter, librarySearch]);

  useEffect(() => { load(); }, [load]);

  // ── select mode ───────────────────────────────────────────────────────────
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); lastIndexRef.current = null; };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  };

  const handleCardClick = (video: Video, index: number, e: React.MouseEvent) => {
    if (selectMode) {
      // Shift-click selects the contiguous range from the last interacted card.
      if (e.shiftKey && lastIndexRef.current !== null) {
        const start = Math.min(lastIndexRef.current, index);
        const end = Math.max(lastIndexRef.current, index);
        setSelected((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) next.add(videos[i].video_id);
          return next;
        });
      } else {
        toggleSelect(video.video_id);
      }
      lastIndexRef.current = index;
      return;
    }
    setDetail(detail?.video_id === video.video_id ? null : video);
  };

  const handleLongPress = (video: Video, index: number) => {
    setSelectMode(true);
    setSelected((prev) => new Set(prev).add(video.video_id));
    lastIndexRef.current = index;
    setDetail(null);
  };

  const toggleSelectAll = () => {
    const ids = videos.map((v) => v.video_id);
    setSelected((prev) => (prev.size >= ids.length && ids.length > 0 ? new Set() : new Set(ids)));
  };

  // ── tab switching ─────────────────────────────────────────────────────────
  const goTab = (t: Tab) => {
    setTab(t);
    setDetail(null);
    exitSelectMode();
    setSidebarOpen(false);
    if (t !== "brains") setBrainId(null);
  };

  const goFilter = (f: Filter) => {
    setFilter(f);
    setTab("library");
    setDetail(null);
    exitSelectMode();
    setSidebarOpen(false);
    setBrainId(null);
  };

  const goBrain = (id: number) => {
    setBrainId(id);
    setTab("brains");
    setDetail(null);
    exitSelectMode();
    setSidebarOpen(false);
  };

  // ── data actions ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    const blob = new Blob([JSON.stringify(await exportAllData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ytlibrary-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try { await importAllData(JSON.parse(await file.text())); load(); }
      catch { alert("Invalid backup file."); }
    };
    input.click();
  };

  const handleDeleteBrain = async (id: number) => {
    if (!confirm("Delete this brain? Videos are not affected.")) return;
    await deleteBrain(id);
    if (brainId === id) { setBrainId(null); setTab("brains"); }
    load();
  };

  const selectedArr = Array.from(selected);
  const isLibrary = tab === "library";
  const isSearch  = tab === "search";
  const isBrains  = tab === "brains";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg text-text">

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 bg-surface border-r border-border overflow-y-auto">
        <div className="px-3 pt-5 pb-2 flex flex-col gap-0.5">
          <SideItem icon={<Library size={15} />} label="Library"
            active={isLibrary && !filter} onClick={() => { goFilter(null); setLibrarySearch(""); }} />
          <SideItem icon={<Search size={15} />} label="Search YouTube"
            active={isSearch} onClick={() => goTab("search")} />
        </div>

        {channels.length > 0 && (
          <SideSection label="Channels">
            {channels.map((c) => (
              <SideItem key={c} label={c} active={filter?.type === "channel" && filter.name === c}
                onClick={() => goFilter({ type: "channel", name: c })} />
            ))}
          </SideSection>
        )}
        {tags.length > 0 && (
          <SideSection label="Tags">
            {tags.map((t) => (
              <SideItem key={t.id} label={`# ${t.name}`} active={filter?.type === "tag" && filter.name === t.name}
                onClick={() => goFilter({ type: "tag", name: t.name })} />
            ))}
          </SideSection>
        )}
        <SideSection label="Brains" action={
          <button onClick={() => setShowNewBrain(true)} className="p-0.5 rounded hover:bg-hover text-subtle hover:text-text transition-colors">
            <Plus size={13} />
          </button>
        }>
          {brains.length === 0
            ? <p className="text-[11px] text-muted px-2 py-1">No brains yet</p>
            : brains.map((b) => (
              <div key={b.id} className="group flex items-center gap-1">
                <SideItem icon={<Brain size={12} className="shrink-0" />} label={b.name}
                  badge={b.video_count} active={brainId === b.id}
                  onClick={() => goBrain(b.id!)} className="flex-1 min-w-0" />
                <button onClick={() => handleDeleteBrain(b.id!)}
                  className="hidden group-hover:flex p-1 text-muted hover:text-red-400 rounded transition-colors shrink-0">
                  <X size={11} />
                </button>
              </div>
            ))
          }
        </SideSection>
      </aside>

      {/* ── Mobile sidebar drawer ──────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border flex flex-col overflow-y-auto animate-slide-up md:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-primary" />
                <span className="font-bold text-text">Brain Builder</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-subtle hover:text-text rounded-lg hover:bg-hover">
                <X size={18} />
              </button>
            </div>
            <div className="px-3 pt-3 pb-2 flex flex-col gap-0.5">
              <SideItem icon={<Library size={15} />} label="Library" active={isLibrary && !filter}
                onClick={() => { goFilter(null); setLibrarySearch(""); }} />
              <SideItem icon={<Search size={15} />} label="Search YouTube" active={isSearch}
                onClick={() => goTab("search")} />
            </div>
            {channels.length > 0 && (
              <SideSection label="Channels">
                {channels.map((c) => (
                  <SideItem key={c} label={c} active={filter?.type === "channel" && filter.name === c}
                    onClick={() => goFilter({ type: "channel", name: c })} />
                ))}
              </SideSection>
            )}
            {tags.length > 0 && (
              <SideSection label="Tags">
                {tags.map((t) => (
                  <SideItem key={t.id} label={`# ${t.name}`} active={filter?.type === "tag" && filter.name === t.name}
                    onClick={() => goFilter({ type: "tag", name: t.name })} />
                ))}
              </SideSection>
            )}
            <SideSection label="Brains" action={
              <button onClick={() => setShowNewBrain(true)} className="p-0.5 rounded hover:bg-hover text-subtle hover:text-text">
                <Plus size={13} />
              </button>
            }>
              {brains.length === 0
                ? <p className="text-[11px] text-muted px-2 py-1">No brains yet</p>
                : brains.map((b) => (
                  <SideItem key={b.id} icon={<Brain size={12} className="shrink-0" />} label={b.name}
                    badge={b.video_count} active={brainId === b.id} onClick={() => goBrain(b.id!)} />
                ))
              }
            </SideSection>
            {/* Mobile-only data actions */}
            <div className="mt-auto px-3 pb-6 pt-3 border-t border-border flex flex-col gap-1">
              <button onClick={handleImportData} className="flex items-center gap-2 px-2 py-2 text-sm text-subtle hover:text-text hover:bg-hover rounded-xl transition-colors">
                <Upload size={15} /> Import backup
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-2 py-2 text-sm text-subtle hover:text-text hover:bg-hover rounded-xl transition-colors">
                <Download size={15} /> Export backup
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="flex items-center gap-2 px-3 sm:px-4 h-12 border-b border-border bg-surface shrink-0">
          {/* Mobile hamburger */}
          <button className="md:hidden p-1.5 text-subtle hover:text-text rounded-lg hover:bg-hover transition-colors"
            onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          {/* Logo (desktop) */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <Brain size={17} className="text-primary" />
            <span className="text-sm font-bold">Brain Builder</span>
          </div>

          {/* Context breadcrumb / search */}
          <div className="flex-1 min-w-0 mx-1 sm:mx-3">
            {isLibrary && (
              <div className="relative max-w-sm">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
                <input
                  ref={searchInputRef}
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder={filter ? `Filter in ${filter.name}…` : "Filter library…"}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            )}
            {isSearch && (
              <span className="text-sm font-semibold text-text">Search YouTube</span>
            )}
            {isBrains && !brainId && (
              <span className="text-sm font-semibold text-text">Brains</span>
            )}
            {isBrains && brainId && (
              <button onClick={() => { setBrainId(null); }} className="flex items-center gap-1 text-sm text-subtle hover:text-text transition-colors">
                <ChevronLeft size={14} /> Brains
              </button>
            )}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLibrary && !selectMode && (
              <button onClick={() => { setSelectMode(true); }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-subtle hover:text-text hover:bg-hover rounded-xl transition-colors">
                <CheckSquare size={13} /> Select
              </button>
            )}
            {selectMode && (
              <button onClick={exitSelectMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text bg-hover rounded-xl">
                <X size={13} /> Cancel
              </button>
            )}
            <button onClick={handleImportData} title="Import backup"
              className="hidden md:flex p-1.5 text-subtle hover:text-text hover:bg-hover rounded-lg transition-colors">
              <Upload size={15} />
            </button>
            <button onClick={handleExport} title="Export backup"
              className="hidden md:flex p-1.5 text-subtle hover:text-text hover:bg-hover rounded-lg transition-colors">
              <Download size={15} />
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary hover:bg-primary-dim text-white text-xs font-semibold rounded-xl transition-colors">
              <Plus size={13} />
              <span className="hidden sm:inline">Import URL</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 flex overflow-hidden pb-14 md:pb-0">
          {/* Library */}
          {isLibrary && (
            <>
              <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4">
                {videos.length === 0 ? (
                  <EmptyLibrary onImport={() => setShowImport(true)} onSearch={() => goTab("search")} />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-subtle">{videos.length} video{videos.length !== 1 ? "s" : ""}
                        {filter && <span className="text-muted"> · {filter.name}</span>}
                      </p>
                      {/* Mobile select toggle */}
                      {!selectMode && (
                        <button onClick={() => setSelectMode(true)}
                          className="sm:hidden flex items-center gap-1 text-xs text-subtle hover:text-text">
                          <CheckSquare size={12} /> Select
                        </button>
                      )}
                    </div>
                    <div key={filter?.name ?? "all"} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 animate-fade-in">
                      {videos.map((v, i) => (
                        <VideoCard key={v.video_id} video={v} tags={vtags[v.video_id]}
                          selected={selected.has(v.video_id)} selectMode={selectMode}
                          onClick={(e) => handleCardClick(v, i, e)}
                          onLongPress={() => handleLongPress(v, i)}
                          onQuickSelect={() => handleLongPress(v, i)} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Detail panel (desktop side / mobile bottom sheet) */}
              {detail && !selectMode && (
                <>
                  {/* Desktop: side panel */}
                  <div className="hidden md:block w-80 shrink-0 border-l border-border overflow-hidden">
                    <DetailPanel video={detail} onClose={() => setDetail(null)}
                      onUpdate={load} onDelete={() => { setDetail(null); load(); }} />
                  </div>
                  {/* Mobile: bottom sheet */}
                  <div className="md:hidden fixed inset-0 z-30">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
                    <div className="absolute bottom-14 left-0 right-0 h-[70dvh] bg-card rounded-t-3xl border-t border-border overflow-hidden animate-slide-up">
                      <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-1" />
                      <DetailPanel video={detail} onClose={() => setDetail(null)}
                        onUpdate={load} onDelete={() => { setDetail(null); load(); }} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Search */}
          {isSearch && (
            <div className="flex-1 overflow-hidden animate-fade-in">
              <SearchView onImported={load} />
            </div>
          )}

          {/* Brains */}
          {isBrains && !brainId && (
            <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-subtle">{brains.length} brain{brains.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setShowNewBrain(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary text-primary hover:text-white text-xs font-semibold rounded-xl transition-all duration-150">
                  <Plus size={13} /> New Brain
                </button>
              </div>
              {brains.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-subtle gap-2">
                  <Brain size={36} className="opacity-20" />
                  <p className="text-sm">No brains yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {brains.map((b) => (
                    <button key={b.id} onClick={() => goBrain(b.id!)}
                      className="flex items-center gap-3 bg-card border border-border hover:border-muted rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.99] group">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <Brain size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{b.name}</p>
                        {b.description && <p className="text-xs text-subtle truncate">{b.description}</p>}
                      </div>
                      <span className="text-xs text-muted shrink-0 group-hover:text-subtle transition-colors">
                        {b.video_count} video{b.video_count !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isBrains && brainId && (
            <div className="flex-1 overflow-hidden animate-fade-in">
              <BrainView brainId={brainId} onBack={() => setBrainId(null)} onChanged={load} />
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface/95 backdrop-blur border-t border-border flex safe-bottom">
        <BottomTab icon={<Library size={21} />} label="Library" active={isLibrary} onClick={() => goTab("library")} />
        <BottomTab icon={<Search size={21} />}  label="Search"  active={isSearch}  onClick={() => goTab("search")} />
        <BottomTab icon={<Brain size={21} />}   label="Brains"  active={isBrains}  onClick={() => goTab("brains")}
          badge={brains.length > 0 ? brains.length : undefined} />
      </nav>

      {/* ── Multi-select bar ────────────────────────────────────────────── */}
      {selectMode && selected.size > 0 && (
        <SelectionBar selectedIds={selectedArr} brains={brains}
          totalCount={videos.length}
          allSelected={selected.size >= videos.length && videos.length > 0}
          onToggleSelectAll={toggleSelectAll}
          onClear={exitSelectMode} onDeleted={load} />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)}
          onImported={(v) => { setShowImport(false); load(); setDetail(v); setTab("library"); }} />
      )}
      {showNewBrain && (
        <CreateBrainModal onClose={() => setShowNewBrain(false)}
          onCreated={(id) => { setShowNewBrain(false); load(); goBrain(id); }} />
      )}
    </div>
  );
}

// ── Small shared UI components ───────────────────────────────────────────────

function SideItem({ icon, label, active, onClick, badge, className }: {
  icon?: React.ReactNode; label: string; active?: boolean;
  onClick: () => void; badge?: number; className?: string;
}) {
  return (
    <button onClick={onClick} className={cn(
      "relative flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-xl text-sm transition-all duration-150 ease-out-soft",
      active ? "bg-primary/15 text-primary" : "text-subtle hover:text-text hover:bg-hover",
      className
    )}>
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-primary" />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && badge > 0 && <span className="text-[10px] text-muted shrink-0">{badge}</span>}
    </button>
  );
}

function SideSection({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-3 py-2 border-t border-border">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-widest">{label}</span>
        {action}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function BottomTab({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} className={cn(
      "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium relative transition-colors",
      active ? "text-primary" : "text-subtle"
    )}>
      <span className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary transition-all duration-200 ease-out-soft",
        active ? "w-8 opacity-100" : "w-0 opacity-0"
      )} />
      <span className={cn("transition-transform duration-150 ease-out-soft", active && "scale-110 -translate-y-0.5")}>{icon}</span>
      {label}
      {badge !== undefined && (
        <span className="absolute top-1.5 right-1/4 translate-x-3 w-4 h-4 bg-primary rounded-full text-[9px] text-white flex items-center justify-center font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function EmptyLibrary({ onImport, onSearch }: { onImport: () => void; onSearch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] text-center px-6 gap-4">
      <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center">
        <Brain size={36} className="text-primary/50" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-text mb-1">Library is empty</h2>
        <p className="text-sm text-subtle max-w-xs">Search YouTube or paste a URL to start building your AI video library.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
        <button onClick={onSearch}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dim text-white text-sm font-semibold rounded-2xl transition-colors active:scale-95">
          <Search size={15} /> Search YouTube
        </button>
        <button onClick={onImport}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-card hover:bg-hover border border-border text-text text-sm font-semibold rounded-2xl transition-colors active:scale-95">
          <Plus size={15} /> Import URL
        </button>
      </div>
    </div>
  );
}
