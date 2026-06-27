"use client";
import { useState } from "react";
import { X, Brain, Trash2, Check, ChevronRight, CheckCheck } from "lucide-react";
import { addToBrain, deleteVideo } from "@/lib/db";
import type { Brain as BrainType } from "@/lib/types";

interface Props {
  selectedIds: string[];
  brains: (BrainType & { video_count: number })[];
  totalCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onClear: () => void;
  onDeleted: () => void;
}

export default function SelectionBar({
  selectedIds, brains, totalCount, allSelected, onToggleSelectAll, onClear, onDeleted,
}: Props) {
  const [showBrains, setShowBrains] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAddToBrain = async (brainId: number) => {
    await addToBrain(brainId, selectedIds);
    setAdded(brainId);
    setTimeout(() => { setAdded(null); setShowBrains(false); onClear(); }, 1100);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} video${selectedIds.length > 1 ? "s" : ""}?`)) return;
    setBusy(true);
    for (const id of selectedIds) await deleteVideo(id);
    setBusy(false);
    onDeleted();
    onClear();
  };

  return (
    <>
      {/* Brain picker sheet */}
      {showBrains && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowBrains(false)} />
          <div className="relative bg-card border border-border rounded-t-3xl md:rounded-2xl w-full md:max-w-sm p-4 shadow-float animate-slide-up md:animate-scale-in safe-bottom">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="text-sm font-semibold text-text mb-3">
              Add {selectedIds.length} video{selectedIds.length > 1 ? "s" : ""} to Brain
            </h3>
            {brains.length === 0 ? (
              <p className="text-sm text-subtle py-4 text-center">No brains yet — create one first</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {brains.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleAddToBrain(b.id!)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-hover active:bg-hover transition-colors text-left"
                  >
                    <Brain size={16} className="text-primary shrink-0" />
                    <span className="flex-1 text-sm text-text truncate">{b.name}</span>
                    {added === b.id
                      ? <Check size={16} className="text-success shrink-0 animate-pop-in" />
                      : <ChevronRight size={14} className="text-subtle shrink-0" />
                    }
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating bar */}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up px-2 w-full max-w-[calc(100vw-1rem)] sm:w-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-card/95 backdrop-blur border border-border rounded-2xl shadow-float px-2.5 py-2 mx-auto w-fit">
          <button onClick={onClear} className="p-1.5 text-subtle hover:text-text rounded-lg hover:bg-hover transition-colors">
            <X size={16} />
          </button>
          <span className="text-sm font-semibold text-text px-0.5 whitespace-nowrap tabular-nums">
            {selectedIds.length}<span className="text-subtle font-normal">/{totalCount}</span>
          </span>
          <button
            onClick={onToggleSelectAll}
            title={allSelected ? "Clear selection" : "Select all"}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-subtle hover:text-text rounded-lg hover:bg-hover transition-colors whitespace-nowrap"
          >
            <CheckCheck size={14} />
            <span className="hidden sm:inline">{allSelected ? "Clear" : "All"}</span>
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <button
            onClick={() => setShowBrains(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary text-primary hover:text-white text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95 whitespace-nowrap"
          >
            <Brain size={13} />
            <span className="hidden sm:inline">Add to Brain</span>
            <span className="sm:hidden">Brain</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </>
  );
}
