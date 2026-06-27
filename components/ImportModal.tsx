"use client";
import { useState } from "react";
import { X, Download, Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { saveVideo } from "@/lib/db";
import { getApifyToken } from "@/lib/settings";
import type { Video } from "@/lib/types";

interface Props {
  onClose: () => void;
  onImported: (video: Video) => void;
  onOpenSettings?: () => void;
}

export default function ImportModal({ onClose, onImported, onOpenSettings }: Props) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const hasToken = getApifyToken().length > 0;

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, apifyToken: getApifyToken() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      await saveVideo(data as Video);
      setStatus("success");
      setMessage(`Saved: ${data.title}`);
      onImported(data as Video);
      setTimeout(onClose, 1500);
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 shadow-float animate-slide-up sm:animate-scale-in">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text">Import YouTube Video</h2>
          <button onClick={onClose} className="text-subtle hover:text-text p-1 rounded-lg hover:bg-hover transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 safe-bottom">
          <div>
            <label className="text-xs text-subtle mb-1.5 block">YouTube URL</label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          {!hasToken && (
            <div className="flex items-start gap-2 text-xs rounded-xl px-3.5 py-2.5 bg-primary/10 text-dim border border-primary/20">
              <Info size={14} className="shrink-0 mt-0.5 text-primary" />
              <span>
                No Apify token set, so transcripts won&apos;t be pulled.{" "}
                {onOpenSettings && (
                  <button onClick={onOpenSettings} className="text-primary hover:underline font-medium">
                    Add it in Settings
                  </button>
                )}
                {" "}to capture transcripts for your brains.
              </span>
            </div>
          )}

          {message && (
            <div
              className={`flex items-start gap-2 text-sm rounded-xl px-3.5 py-2.5 ${
                status === "error"
                  ? "bg-danger/10 text-danger border border-danger/30"
                  : "bg-success/10 text-success border border-success/30"
              }`}
            >
              {status === "error" ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
              {message}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-subtle hover:text-text hover:bg-hover rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={status === "loading" || !url.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold active:scale-[0.98]"
            >
              {status === "loading" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              {status === "loading" ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
