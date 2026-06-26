"use client";
import { useState, useEffect } from "react";
import {
  Brain, ArrowLeft, GripVertical, Trash2, FileText, Zap, Copy, Check,
  Edit3, Save, X,
} from "lucide-react";
import {
  getBrain, getBrainItems, removeFromBrain, updateBrain, updateBrainItem,
} from "@/lib/db";
import { formatDuration } from "@/lib/utils";
import type { Brain as BrainType, BrainItem, Video } from "@/lib/types";

interface Props {
  brainId: number;
  onBack: () => void;
  onChanged: () => void;
}

type Item = BrainItem & Video;

export default function BrainView({ brainId, onBack, onChanged }: Props) {
  const [brain, setBrain] = useState<BrainType | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const [b, it] = await Promise.all([getBrain(brainId), getBrainItems(brainId)]);
    if (b) { setBrain(b); setEditName(b.name); setEditDesc(b.description ?? ""); }
    setItems(it);
  };

  useEffect(() => { load(); }, [brainId]);

  const handleSaveEdit = async () => {
    await updateBrain(brainId, { name: editName, description: editDesc });
    setEditing(false);
    load();
    onChanged();
  };

  const handleRemove = async (video_id: string) => {
    await removeFromBrain(brainId, video_id);
    load();
    onChanged();
  };

  const handleModeToggle = async (item: Item) => {
    const next: "full" | "summary" = item.mode === "full" ? "summary" : "full";
    await updateBrainItem(item.id!, { mode: next });
    load();
  };

  const handleExport = () => {
    if (!brain) return;
    const parts: string[] = [`# Brain: ${brain.name}`, brain.description ?? "", ""];
    for (const item of items) {
      parts.push(`## ${item.title}`);
      parts.push(`Channel: ${item.channel} | URL: ${item.url}`);
      if (item.duration) parts.push(`Duration: ${formatDuration(item.duration)}`);
      parts.push("");
      if (item.mode === "summary" && item.summary) {
        parts.push("### Summary");
        parts.push(item.summary);
      } else if (item.transcript) {
        parts.push("### Transcript");
        parts.push(item.transcript);
      }
      parts.push("\n---\n");
    }
    const text = parts.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTokens = items.reduce((acc, item) => {
    const text = item.mode === "summary" ? item.summary ?? "" : item.transcript ?? "";
    return acc + Math.ceil(text.length / 4);
  }, 0);

  if (!brain) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border bg-surface-raised">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1 rounded hover:bg-surface-hover">
          <ArrowLeft size={18} />
        </button>
        <Brain size={18} className="text-blue-400 shrink-0" />
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-surface-card border border-brand rounded-lg px-2.5 py-1 text-sm text-white flex-1 min-w-0 focus:outline-none"
            />
            <button onClick={handleSaveEdit} className="p-1.5 bg-brand hover:bg-brand-hover rounded-lg text-white">
              <Save size={14} />
            </button>
            <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-surface-hover">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate">{brain.name}</h1>
            <button onClick={() => setEditing(true)} className="p-1 text-gray-500 hover:text-gray-300 rounded hover:bg-surface-hover shrink-0">
              <Edit3 size={13} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Zap size={12} />
            ~{totalTokens.toLocaleString()} tokens
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Export to Clipboard"}
          </button>
        </div>
      </div>

      {/* Description */}
      {(editing || brain.description) && !editing && (
        <div className="px-5 py-2 text-sm text-gray-400 border-b border-surface-border">
          {brain.description}
        </div>
      )}
      {editing && (
        <div className="px-5 py-2 border-b border-surface-border">
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full text-sm bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-brand resize-none"
            rows={2}
          />
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <Brain size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No videos in this brain yet.</p>
            <p className="text-xs mt-1">Open a video detail panel and add it here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <BrainItemRow
                key={item.video_id}
                item={item}
                onRemove={() => handleRemove(item.video_id)}
                onToggleMode={() => handleModeToggle(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BrainItemRow({
  item, onRemove, onToggleMode,
}: {
  item: Item;
  onRemove: () => void;
  onToggleMode: () => void;
}) {
  const thumb = item.thumbnail_url || `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`;
  const hasContent = item.mode === "summary" ? !!item.summary : !!item.transcript;

  return (
    <div className="flex gap-3 bg-surface-card border border-surface-border rounded-xl p-3 group">
      <GripVertical size={16} className="text-gray-600 shrink-0 mt-0.5 cursor-grab" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt={item.title}
        className="w-24 h-14 rounded-lg object-cover shrink-0 bg-surface-raised"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 line-clamp-2 leading-snug">{item.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{item.channel}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onToggleMode}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              item.mode === "full"
                ? "border-blue-700 text-blue-400 bg-blue-900/20"
                : "border-amber-700 text-amber-400 bg-amber-900/20"
            }`}
          >
            <FileText size={10} />
            {item.mode === "full" ? "Full transcript" : "Summary only"}
          </button>
          {!hasContent && (
            <span className="text-[10px] text-gray-600 italic">No content</span>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1 h-fit rounded transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
