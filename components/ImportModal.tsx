"use client";
import { useState } from "react";
import { X, Download, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { saveVideo } from "@/lib/db";
import type { Video } from "@/lib/types";

interface Props {
  onClose: () => void;
  onImported: (video: Video) => void;
}

export default function ImportModal({ onClose, onImported }: Props) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-white">Import YouTube Video</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">YouTube URL</label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-surface-raised border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {message && (
            <div
              className={`flex items-start gap-2 text-sm rounded-xl px-3.5 py-2.5 ${
                status === "error"
                  ? "bg-red-900/30 text-red-300 border border-red-800/40"
                  : "bg-green-900/30 text-green-300 border border-green-800/40"
              }`}
            >
              {status === "error" ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
              {message}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-surface-hover rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={status === "loading" || !url.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-medium"
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
