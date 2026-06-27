"use client";
import { useState, useEffect } from "react";
import {
  Brain, ArrowLeft, GripVertical, Trash2, FileText, Zap, Copy, Check,
  Edit3, Save, X, Loader2, KeyRound, AlertCircle,
} from "lucide-react";
import {
  getBrain, getBrainItems, removeFromBrain, updateBrain, updateBrainItem,
  updateVideoTranscript,
} from "@/lib/db";
import { getApifyToken } from "@/lib/settings";
import { formatDuration } from "@/lib/utils";
import type { Brain as BrainType, BrainItem, Video } from "@/lib/types";

interface Props {
  brainId: number;
  onBack: () => void;
  onChanged: () => void;
  onOpenSettings?: () => void;
}

type Item = BrainItem & Video;

export default function BrainView({ brainId, onBack, onChanged, onOpenSettings }: Props) {
  const [brain, setBrain] = useState<BrainType | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{ done: number; total: number } | null>(null);
  const [needsToken, setNeedsToken] = useState(false);
  const [exportError, setExportError] = useState("");

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

  // Fetch + persist transcripts for any items that don't have one yet, so
  // videos imported before transcripts were captured still export fully.
  const ensureTranscripts = async (current: Item[]): Promise<Item[]> => {
    const missing = current.filter((it) => !it.transcript && it.video_id);
    if (missing.length === 0) return current;

    const token = getApifyToken();
    if (!token) {
      setNeedsToken(true);
      return current;
    }

    const fetched = new Map<string, string>();
    setFetchProgress({ done: 0, total: missing.length });
    let done = 0;
    for (const it of missing) {
      try {
        const res = await fetch("/api/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_id: it.video_id, apifyToken: token }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.transcript) {
            await updateVideoTranscript(it.video_id, data.transcript);
            fetched.set(it.video_id, data.transcript);
          }
        } else {
          const data = await res.json().catch(() => ({}));
          if (data?.error) setExportError(data.error);
        }
      } catch {
        /* leave this one without a transcript */
      }
      done += 1;
      setFetchProgress({ done, total: missing.length });
    }
    setFetchProgress(null);
    return current.map((it) => (fetched.has(it.video_id) ? { ...it, transcript: fetched.get(it.video_id) } : it));
  };

  const buildExport = (list: Item[]): string => {
    const parts: string[] = [`# Brain: ${brain!.name}`, brain!.description ?? "", ""];
    for (const item of list) {
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
      } else {
        parts.push("_No transcript available for this video._");
      }
      parts.push("\n---\n");
    }
    return parts.join("\n");
  };

  const handleExport = async () => {
    if (!brain || exporting) return;
    setExporting(true);
    setNeedsToken(false);
    setExportError("");
    try {
      const missing = items.filter((it) => !it.transcript && it.video_id);
      // If transcripts are missing and there's no Apify token, prompt instead of
      // copying a placeholder-only export.
      if (missing.length > 0 && !getApifyToken()) {
        setNeedsToken(true);
        return;
      }
      const fresh = await ensureTranscripts(items);
      if (fresh !== items) setItems(fresh);
      await navigator.clipboard.writeText(buildExport(fresh));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setExporting(false);
      setFetchProgress(null);
    }
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
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs bg-primary hover:bg-primary-dim disabled:opacity-80 text-white px-3 py-1.5 rounded-xl transition-colors active:scale-[0.98]"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : copied ? <Check size={13} /> : <Copy size={13} />}
            <span className="hidden sm:inline">
              {fetchProgress
                ? `Fetching transcripts ${fetchProgress.done}/${fetchProgress.total}…`
                : exporting
                ? "Exporting…"
                : copied
                ? "Copied!"
                : "Export to Clipboard"}
            </span>
            <span className="sm:hidden">
              {fetchProgress ? `${fetchProgress.done}/${fetchProgress.total}` : exporting ? "…" : copied ? "Copied!" : "Export"}
            </span>
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

      {/* Apify token prompt / export errors */}
      {needsToken && (
        <div className="mx-4 sm:mx-5 mt-3 flex items-start gap-2 text-sm rounded-xl px-3.5 py-2.5 bg-primary/10 text-dim border border-primary/20">
          <KeyRound size={15} className="shrink-0 mt-0.5 text-primary" />
          <span>
            Transcripts haven&apos;t been captured for these videos. Add your Apify token in{" "}
            {onOpenSettings ? (
              <button onClick={onOpenSettings} className="text-primary hover:underline font-medium">Settings</button>
            ) : (
              <span className="text-primary font-medium">Settings</span>
            )}
            , then export again to pull and include them.
          </span>
        </div>
      )}
      {exportError && (
        <div className="mx-4 sm:mx-5 mt-3 flex items-start gap-2 text-sm rounded-xl px-3.5 py-2.5 bg-danger/10 text-danger border border-danger/30">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{exportError}</span>
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
