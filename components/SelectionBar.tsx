"use client";
import { useState } from "react";
import { X, Brain, Trash2, Check, ChevronRight } from "lucide-react";
import { addToBrain, deleteVideo } from "@/lib/db";
import type { Brain as BrainType } from "@/lib/types";

interface Props {
  selectedIds: string[];
  brains: (BrainType & { video_count: number })[];
  onClear: () => void;
  onDeleted: () => void;
}

export default function SelectionBar({ selectedIds, brains, onClear, onDeleted }: Props) {
  const [showBrains, setShowBrains] = useState(false);
  const [added, setAdded] = useState<number | null>(null);

  const handleAddToBrain = async (brainId: number) => {
    await addToBrain(brainId, selectedIds);
    setAdded(brainId);
    setTimeout(() => { setAdded(null); setShowBrains(false); onClear(); }, 1200);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} video${selectedIds.length > 1 ? "s" : ""}?`)) return;
    for (const id of selectedIds) await deleteVideo(id);
    onDeleted();
    onClear();
  };

  return (
    <>
      {/* Brain picker sheet */}
      {showBrains && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBrains(false)} />
          <div className="relative bg-card border border-border rounded-t-3xl md:rounded-2xl w-full md:max-w-sm p-4 animate-slide-up md:animate-scale-in">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="text-sm font-semibold text-[#f2f2f7] mb-3">Add to Brain</h3>
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
                    <span className="flex-1 text-sm text-[#f2f2f7] truncate">{b.name}</span>
                    {added === b.id
                      ? <Check size={16} className="text-success shrink-0" />
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
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl shadow-2xl px-3 py-2">
          <button onClick={onClear} className="p-1.5 text-subtle hover:text-[#f2f2f7] rounded-lg hover:bg-hover transition-colors">
            <X size={16} />
          </button>
          <span className="text-sm font-semibold text-[#f2f2f7] px-1 whitespace-nowrap">
            {selectedIds.length} selected
          </span>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={() => setShowBrains(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary text-primary hover:text-white text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95"
          >
            <Brain size={13} />
            Add to Brain
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </>
  );
}
