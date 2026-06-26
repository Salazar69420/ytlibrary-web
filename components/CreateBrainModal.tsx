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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-blue-400" />
            <h2 className="text-base font-semibold text-white">New Brain</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="My Research Brain"
              className="w-full bg-surface-raised border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this brain for?"
              className="w-full bg-surface-raised border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Token budget</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full bg-surface-raised border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-surface-hover rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-xl font-medium"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
