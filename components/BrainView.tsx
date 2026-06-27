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
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border bg-surface shrink-0">
        <button onClick={onBack} className="text-subtle hover:text-text p-1 rounded-lg hover:bg-hover transition-colors shrink-0">
          <ArrowLeft size={18} />
        </button>
        <Brain size={18} className="text-primary shrink-0" />
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-card border border-primary/60 rounded-xl px-2.5 py-1 text-sm text-text flex-1 min-w-0 focus:outline-none"
            />
            <button onClick={handleSaveEdit} className="p-1.5 bg-primary hover:bg-primary-dim rounded-lg text-white transition-colors">
              <Save size={14} />
            </button>
            <button onClick={() => setEditing(false)} className="p-1.5 text-subtle hover:text-text rounded-lg hover:bg-hover transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-base font-semibold text-text truncate">{brain.name}</h1>
            <button onClick={() => setEditing(true)} className="p-1 text-subtle hover:text-dim rounded hover:bg-hover transition-colors shrink-0">
              <Edit3 size={13} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="hidden sm:flex text-xs text-subtle items-center gap-1">
            <Zap size={12} />
            ~{totalTokens.toLocaleString()} tokens
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs bg-primary hover:bg-primary-dim text-white px-3 py-1.5 rounded-xl transition-colors active:scale-[0.98]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Export to Clipboard"}</span>
            <span className="sm:hidden">{copied ? "Copied!" : "Export"}</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {brain.description && !editing && (
        <div className="px-4 sm:px-5 py-2 text-sm text-subtle border-b border-border">
          {brain.description}
        </div>
      )}
      {editing && (
        <div className="px-4 sm:px-5 py-2 border-b border-border">
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full text-sm bg-card border border-border rounded-xl px-2.5 py-1.5 text-dim placeholder-muted focus:outline-none focus:border-primary/60 resize-none transition-colors"
            rows={2}
          />
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 safe-bottom">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-subtle">
            <Brain size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No videos in this brain yet.</p>
            <p className="text-xs mt-1 text-muted">Open a video and add it here, or multi-select from the library.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
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
    <div className="flex gap-3 bg-card border border-border hover:border-muted rounded-2xl p-3 group transition-colors shadow-card">
      <GripVertical size={16} className="text-muted shrink-0 mt-0.5 cursor-grab" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumb}
        alt={item.title}
        className="w-24 h-14 rounded-lg object-cover shrink-0 bg-surface"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text line-clamp-2 leading-snug">{item.title}</p>
        <p className="text-xs text-subtle mt-0.5">{item.channel}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onToggleMode}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              item.mode === "full"
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-success/40 text-success bg-success/10"
            }`}
          >
            <FileText size={10} />
            {item.mode === "full" ? "Full transcript" : "Summary only"}
          </button>
          {!hasContent && (
            <span className="text-[10px] text-muted italic">No content</span>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-subtle hover:text-danger p-1 h-fit rounded transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
