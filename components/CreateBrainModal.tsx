"use client";
import { useState } from "react";
import { X, Brain } from "lucide-react";
import { createBrain } from "@/lib/db";

interface Props {
  onClose: () => void;
  onCreated: (id: number) => void;
}

export default function CreateBrainModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("150000");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const id = await createBrain(name.trim(), description.trim(), parseInt(budget) || 150000);
    onCreated(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm mx-0 sm:mx-4 shadow-float animate-slide-up sm:animate-scale-in">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-text">New Brain</h2>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-text p-1 rounded-lg hover:bg-hover transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 safe-bottom">
          <div>
            <label className="text-xs text-subtle mb-1.5 block">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="My Research Brain"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-subtle mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this brain for?"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary/60 resize-none transition-colors"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs text-subtle mb-1.5 block">Token budget</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-subtle hover:text-text hover:bg-hover rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-dim disabled:opacity-50 text-white rounded-xl font-semibold active:scale-[0.98] transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
