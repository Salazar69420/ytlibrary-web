"use client";
import { useState, useEffect } from "react";
import {
  X, ExternalLink, Tag, Plus, Trash2, Brain, Clock, Eye, Calendar,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { getVideoTags, setVideoTags, getTags, getBrains, addToBrain, deleteVideo } from "@/lib/db";
import { formatDuration, formatViews, formatDate } from "@/lib/utils";
import type { Video, Brain as BrainType, Tag as TagType } from "@/lib/types";

interface Props {
  video: Video;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function DetailPanel({ video, onClose, onUpdate, onDelete }: Props) {
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [brains, setBrains] = useState<(BrainType & { video_count: number })[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingToBrain, setAddingToBrain] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, at, b] = await Promise.all([
        getVideoTags(video.video_id),
        getTags(),
        getBrains(),
      ]);
      setTags(t);
      setAllTags(at);
      setBrains(b);
    })();
  }, [video.video_id]);

  const handleAddTag = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    await setVideoTags(video.video_id, next);
    setTags(next);
    setNewTag("");
    onUpdate();
  };

  const handleRemoveTag = async (name: string) => {
    const next = tags.filter((t) => t !== name);
    await setVideoTags(video.video_id, next);
    setTags(next);
    onUpdate();
  };

  const handleAddToBrain = async (brain_id: number) => {
    setAddingToBrain(brain_id);
    await addToBrain(brain_id, [video.video_id]);
    setTimeout(() => setAddingToBrain(null), 1000);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${video.title}" from your library?`)) return;
    await deleteVideo(video.video_id);
    onDelete();
  };

  const handleCopyTranscript = () => {
    if (video.transcript) {
      navigator.clipboard.writeText(video.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const thumb = !imgError && video.thumbnail_url
    ? video.thumbnail_url
    : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div className="flex flex-col h-full bg-surface-raised border-l border-surface-border overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border sticky top-0 bg-surface-raised z-10">
        <h2 className="text-sm font-semibold text-gray-200 truncate pr-2">Video Detail</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-surface-hover">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Thumbnail */}
        <div className="rounded-lg overflow-hidden aspect-video bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={video.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title + links */}
        <div>
          <h3 className="text-base font-semibold text-white leading-snug mb-1">{video.title}</h3>
          <p className="text-sm text-blue-400 mb-3">{video.channel}</p>
          <div className="flex gap-2 flex-wrap">
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs bg-red-900/40 hover:bg-red-900/60 text-red-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              Watch on YouTube
            </a>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs bg-surface-card hover:bg-red-900/30 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {video.duration ? (
            <Stat icon={<Clock size={13} />} label="Duration" value={formatDuration(video.duration)} />
          ) : null}
          {video.view_count ? (
            <Stat icon={<Eye size={13} />} label="Views" value={formatViews(video.view_count)} />
          ) : null}
          {video.upload_date ? (
            <Stat icon={<Calendar size={13} />} label="Published" value={formatDate(video.upload_date)} />
          ) : null}
        </div>

        {/* Tags */}
        <Section title="Tags" icon={<Tag size={14} />}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs bg-brand-muted text-blue-300 px-2 py-1 rounded-full">
                {t}
                <button onClick={() => handleRemoveTag(t)} className="hover:text-white ml-0.5">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag(newTag)}
              placeholder="Add tag..."
              className="flex-1 text-xs bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand"
            />
            <button
              onClick={() => handleAddTag(newTag)}
              className="px-2.5 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs rounded-lg transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
          {allTags.filter((t) => !tags.includes(t.name)).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {allTags
                .filter((t) => !tags.includes(t.name))
                .slice(0, 8)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleAddTag(t.name)}
                    className="text-[11px] text-gray-500 hover:text-gray-300 border border-surface-border hover:border-gray-500 px-2 py-0.5 rounded-full transition-colors"
                  >
                    + {t.name}
                  </button>
                ))}
            </div>
          )}
        </Section>

        {/* Add to Brain */}
        {brains.length > 0 && (
          <Section title="Add to Brain" icon={<Brain size={14} />}>
            <div className="flex flex-col gap-1.5">
              {brains.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleAddToBrain(b.id!)}
                  className="flex items-center justify-between text-xs bg-surface-card hover:bg-surface-hover border border-surface-border rounded-lg px-3 py-2 transition-colors text-left"
                >
                  <span className="text-gray-200 truncate">{b.name}</span>
                  {addingToBrain === b.id ? (
                    <Check size={13} className="text-green-400 shrink-0" />
                  ) : (
                    <Plus size={13} className="text-gray-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Transcript */}
        {video.transcript && (
          <Section title="Transcript" icon={null}>
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
              >
                {showTranscript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showTranscript ? "Hide" : "Show"} transcript
              </button>
              <button
                onClick={handleCopyTranscript}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400"
              >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            {showTranscript && (
              <div className="text-xs text-gray-400 leading-relaxed bg-surface-card rounded-lg p-3 max-h-48 overflow-y-auto border border-surface-border whitespace-pre-wrap">
                {video.transcript}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface-card rounded-lg p-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1 text-gray-500 text-[10px]">
        {icon}
        {label}
      </div>
      <span className="text-xs text-gray-200 font-medium">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
