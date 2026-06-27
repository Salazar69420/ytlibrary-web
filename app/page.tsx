"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Library, Brain, Search, Plus, Download, Upload, Menu, X,
} from "lucide-react";
import Sidebar, { type View } from "@/components/Sidebar";
import VideoCard from "@/components/VideoCard";
import DetailPanel from "@/components/DetailPanel";
import BrainView from "@/components/BrainView";
import SearchView from "@/components/SearchView";
import ImportModal from "@/components/ImportModal";
import CreateBrainModal from "@/components/CreateBrainModal";
import {
  getVideos, getChannels, getTags, getBrains, getVideoTags,
  deleteBrain, exportAllData, importAllData,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Video, Tag, Brain as BrainType } from "@/lib/types";

type ActiveTab = "library" | "search" | "brains";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoTags, setVideoTags] = useState<Record<string, string[]>>({});
  const [channels, setChannels] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [brains, setBrains] = useState<(BrainType & { video_count: number })[]>([]);
  const [search, setSearch] = useState("");
  const [sidebarView, setSidebarView] = useState<View>("library");
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreateBrain, setShowCreateBrain] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBrainId, setActiveBrainId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    const filterChannel =
      typeof sidebarView === "object" && sidebarView.type === "channel"
        ? sidebarView.name : undefined;
    const filterTag =
      typeof sidebarView === "object" && sidebarView.type === "tag"
        ? sidebarView.name : undefined;

    const [vids, chs, tgs, brs] = await Promise.all([
      getVideos({ channel: filterChannel, tag: filterTag, search: search || undefined }),
      getChannels(), getTags(), getBrains(),
    ]);
    setVideos(vids);
    setChannels(chs);
    setTags(tgs);
    setBrains(brs);

    const tagMap: Record<string, string[]> = {};
    await Promise.all(vids.map(async (v) => {
      tagMap[v.video_id] = await getVideoTags(v.video_id);
    }));
    setVideoTags(tagMap);
  }, [sidebarView, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ytlibrary-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
      try {
        const data = JSON.parse(await file.text());
        await importAllData(data);
        loadAll();
      } catch {
        alert("Invalid backup file.");
      }
    };
    input.click();
  };

  const handleDeleteBrain = async (id: number) => {
    if (!confirm("Delete this brain? Videos are not affected.")) return;
    await deleteBrain(id);
    if (activeBrainId === id) setActiveBrainId(null);
    loadAll();
  };

  const handleSidebarViewChange = (v: View) => {
    setSidebarView(v);
    setSelectedVideo(null);
    setSidebarOpen(false);
    if (typeof v === "object" && v.type === "brain") {
      setActiveBrainId(v.id);
      setActiveTab("brains");
    } else if (v === "search") {
      setActiveBrainId(null);
      setActiveTab("search");
    } else {
      setActiveBrainId(null);
      setActiveTab("library");
    }
  };

  const showLibraryContent = activeTab === "library" && activeBrainId === null;
  const showBrainContent = (activeTab === "brains" || activeBrainId !== null);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-surface">
      {/* ── Top header ──────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-surface-raised border-b border-surface-border shrink-0 z-20">
        {/* Hamburger (mobile only) */}
        <button
          className="md:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-surface-hover"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Brain size={18} className="text-blue-400" />
          <span className="text-sm font-bold text-white hidden sm:inline">Brain Builder</span>
          <span className="text-xs font-bold text-white sm:hidden">BB</span>
        </div>

        {/* Search bar (library tab only, desktop) */}
        {showLibraryContent && (
          <div className="hidden md:flex flex-1 max-w-sm relative ml-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter library…"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-surface-border rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={handleImportData} title="Import backup" className="p-1.5 text-gray-500 hover:text-white hover:bg-surface-hover rounded-lg transition-colors hidden sm:flex">
            <Upload size={15} />
          </button>
          <button onClick={handleExport} title="Export backup" className="p-1.5 text-gray-500 hover:text-white hover:bg-surface-hover rounded-lg transition-colors hidden sm:flex">
            <Download size={15} />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Import URL</span>
            <span className="sm:hidden">Import</span>
          </button>
        </div>
      </header>

      {/* ── Mobile search bar (below header) ─────────────────────────── */}
      {showLibraryContent && (
        <div className="md:hidden shrink-0 px-3 py-2 border-b border-surface-border bg-surface-raised">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter library…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface-card border border-surface-border rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed md:static top-0 left-0 h-full z-50 md:z-auto transition-transform duration-200",
            "md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Mobile close */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-surface-border">
            <span className="text-sm font-semibold text-white">Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <Sidebar
            channels={channels}
            tags={tags}
            brains={brains}
            activeView={sidebarView}
            onViewChange={handleSidebarViewChange}
            onCreateBrain={() => { setShowCreateBrain(true); setSidebarOpen(false); }}
            onDeleteBrain={handleDeleteBrain}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex min-h-0 pb-16 md:pb-0">
          {/* Brain view */}
          {showBrainContent && activeBrainId ? (
            <div className="flex-1 overflow-hidden">
              <BrainView
                brainId={activeBrainId}
                onBack={() => { setActiveBrainId(null); setSidebarView("library"); setActiveTab("library"); }}
                onChanged={loadAll}
              />
            </div>
          ) : activeTab === "brains" ? (
            /* Brains list on mobile */
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Your Brains</h2>
                <button
                  onClick={() => setShowCreateBrain(true)}
                  className="flex items-center gap-1.5 text-sm bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded-xl"
                >
                  <Plus size={14} /> New Brain
                </button>
              </div>
              {brains.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
                  <Brain size={36} className="opacity-20" />
                  <p className="text-sm">No brains yet — create one to get started</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {brains.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveBrainId(b.id!); setSidebarView({ type: "brain", id: b.id! }); }}
                      className="flex items-center gap-3 bg-surface-card hover:bg-surface-hover border border-surface-border rounded-xl p-4 text-left transition-colors"
                    >
                      <Brain size={20} className="text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{b.name}</p>
                        {b.description && <p className="text-xs text-gray-500 truncate">{b.description}</p>}
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{b.video_count} videos</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "search" ? (
            /* Search view */
            <div className="flex-1 min-h-0 overflow-hidden">
              <SearchView onImported={loadAll} />
            </div>
          ) : (
            /* Library view */
            <>
              <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">
                    {videos.length} video{videos.length !== 1 ? "s" : ""}
                    {typeof sidebarView === "object" && sidebarView.type !== "brain" && (
                      <span className="ml-1 text-gray-600">
                        · {sidebarView.type}: <span className="text-gray-400">{sidebarView.name}</span>
                      </span>
                    )}
                  </span>
                </div>

                {videos.length === 0 ? (
                  <EmptyState onImport={() => setShowImport(true)} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
                    {videos.map((v) => (
                      <VideoCard
                        key={v.video_id}
                        video={v}
                        tags={videoTags[v.video_id] ?? []}
                        selected={selectedVideo?.video_id === v.video_id}
                        onClick={() =>
                          setSelectedVideo(selectedVideo?.video_id === v.video_id ? null : v)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Detail panel */}
              {selectedVideo && (
                <div className={cn(
                  "shrink-0 overflow-hidden",
                  // Mobile: fixed bottom sheet
                  "fixed md:static bottom-16 md:bottom-auto left-0 right-0 md:left-auto md:right-auto",
                  "h-[60dvh] md:h-auto md:w-80",
                  "z-30 md:z-auto",
                  "rounded-t-2xl md:rounded-none",
                  "shadow-2xl md:shadow-none"
                )}>
                  <DetailPanel
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    onUpdate={loadAll}
                    onDelete={() => { setSelectedVideo(null); loadAll(); }}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface-raised border-t border-surface-border flex">
        <TabBtn
          icon={<Library size={20} />}
          label="Library"
          active={activeTab === "library"}
          onClick={() => { setActiveTab("library"); setActiveBrainId(null); setSelectedVideo(null); setSidebarView("library"); }}
        />
        <TabBtn
          icon={<Search size={20} />}
          label="Search"
          active={activeTab === "search"}
          onClick={() => { setActiveTab("search"); setSidebarView("search"); setSelectedVideo(null); }}
        />
        <TabBtn
          icon={<Brain size={20} />}
          label="Brains"
          active={activeTab === "brains" || activeBrainId !== null}
          badge={brains.length}
          onClick={() => { setActiveTab("brains"); setSelectedVideo(null); }}
        />
      </nav>

      {/* Modals */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(v) => { setShowImport(false); loadAll(); setSelectedVideo(v); setActiveTab("library"); }}
        />
      )}
      {showCreateBrain && (
        <CreateBrainModal
          onClose={() => setShowCreateBrain(false)}
          onCreated={(id) => {
            setShowCreateBrain(false);
            loadAll();
            setActiveBrainId(id);
            setSidebarView({ type: "brain", id });
            setActiveTab("brains");
          }}
        />
      )}
    </div>
  );
}

function TabBtn({
  icon, label, active, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative",
        active ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1/4 translate-x-2 bg-brand text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 sm:h-96 text-center px-4">
      <Brain size={48} className="text-gray-700 mb-3 sm:mb-4" />
      <h2 className="text-base sm:text-lg font-semibold text-gray-300 mb-1">Your library is empty</h2>
      <p className="text-xs sm:text-sm text-gray-500 mb-5 max-w-xs">
        Search YouTube or import by URL to start building your library and AI brains.
      </p>
      <button
        onClick={onImport}
        className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Plus size={15} />
        Import your first video
      </button>
    </div>
  );
}
