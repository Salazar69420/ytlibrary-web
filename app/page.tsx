"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Download, Upload, Brain, Library,
} from "lucide-react";
import Sidebar, { type View } from "@/components/Sidebar";
import VideoCard from "@/components/VideoCard";
import DetailPanel from "@/components/DetailPanel";
import BrainView from "@/components/BrainView";
import ImportModal from "@/components/ImportModal";
import CreateBrainModal from "@/components/CreateBrainModal";
import {
  getVideos, getChannels, getTags, getBrains, getVideoTags,
  deleteBrain, exportAllData, importAllData,
} from "@/lib/db";
import type { Video, Tag, Brain as BrainType } from "@/lib/types";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoTags, setVideoTags] = useState<Record<string, string[]>>({});
  const [channels, setChannels] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [brains, setBrains] = useState<(BrainType & { video_count: number })[]>([]);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<View>("library");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreateBrain, setShowCreateBrain] = useState(false);

  const loadAll = useCallback(async () => {
    const filterChannel =
      typeof activeView === "object" && activeView.type === "channel" ? activeView.name : undefined;
    const filterTag =
      typeof activeView === "object" && activeView.type === "tag" ? activeView.name : undefined;

    const [vids, chs, tgs, brs] = await Promise.all([
      getVideos({ channel: filterChannel, tag: filterTag, search: search || undefined }),
      getChannels(),
      getTags(),
      getBrains(),
    ]);
    setVideos(vids);
    setChannels(chs);
    setTags(tgs);
    setBrains(brs);

    // load tags for visible videos
    const tagMap: Record<string, string[]> = {};
    await Promise.all(
      vids.map(async (v) => {
        tagMap[v.video_id] = await getVideoTags(v.video_id);
      })
    );
    setVideoTags(tagMap);
  }, [activeView, search]);

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
      const text = await file.text();
      try {
        const data = JSON.parse(text);
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
    if (typeof activeView === "object" && activeView.type === "brain" && activeView.id === id) {
      setActiveView("library");
    }
    loadAll();
  };

  const isBrainView = typeof activeView === "object" && activeView.type === "brain";
  const isLibraryView = !isBrainView;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 py-3 bg-surface-raised border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <Brain size={20} className="text-blue-400" />
          <span className="text-base font-bold text-white">Brain Builder</span>
          <span className="text-gray-600 text-base font-light mx-1">·</span>
          <span className="text-sm text-gray-400">YT Library</span>
        </div>

        {/* Search */}
        {isLibraryView && (
          <div className="flex-1 max-w-md relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface-card border border-surface-border rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleImportData}
            title="Import backup"
            className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-lg transition-colors"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={handleExport}
            title="Export backup"
            className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-lg transition-colors"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={15} />
            Import URL
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          channels={channels}
          tags={tags}
          brains={brains}
          activeView={activeView}
          onViewChange={(v) => { setActiveView(v); setSelectedVideo(null); }}
          onCreateBrain={() => setShowCreateBrain(true)}
          onDeleteBrain={handleDeleteBrain}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 flex">
          {isBrainView ? (
            <div className="flex-1 overflow-hidden">
              <BrainView
                brainId={(activeView as { type: "brain"; id: number }).id}
                onBack={() => { setActiveView("library"); setSelectedVideo(null); }}
                onChanged={loadAll}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0 overflow-y-auto p-5">
              {/* Stats bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Library size={14} />
                  <span>{videos.length} video{videos.length !== 1 ? "s" : ""}</span>
                  {typeof activeView === "object" && (
                    <span className="text-gray-600">
                      — filtered by {activeView.type === "channel" ? "channel" : "tag"}:{" "}
                      <span className="text-gray-400">
                        {activeView.type === "channel" ? activeView.name : activeView.name}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {videos.length === 0 ? (
                <EmptyState onImport={() => setShowImport(true)} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {videos.map((v) => (
                    <VideoCard
                      key={v.video_id}
                      video={v}
                      tags={videoTags[v.video_id] ?? []}
                      selected={selectedVideo?.video_id === v.video_id}
                      onClick={() => setSelectedVideo(selectedVideo?.video_id === v.video_id ? null : v)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detail panel */}
          {selectedVideo && isLibraryView && (
            <div className="w-80 shrink-0 overflow-hidden">
              <DetailPanel
                video={selectedVideo}
                onClose={() => setSelectedVideo(null)}
                onUpdate={loadAll}
                onDelete={() => { setSelectedVideo(null); loadAll(); }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(v) => { setShowImport(false); loadAll(); setSelectedVideo(v); }}
        />
      )}
      {showCreateBrain && (
        <CreateBrainModal
          onClose={() => setShowCreateBrain(false)}
          onCreated={(id) => { setShowCreateBrain(false); loadAll(); setActiveView({ type: "brain", id }); }}
        />
      )}
    </div>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Brain size={56} className="text-gray-700 mb-4" />
      <h2 className="text-lg font-semibold text-gray-300 mb-1">Your library is empty</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Import YouTube videos by URL to start building your personal library and AI brains.
      </p>
      <button
        onClick={onImport}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Plus size={16} />
        Import your first video
      </button>
    </div>
  );
}
