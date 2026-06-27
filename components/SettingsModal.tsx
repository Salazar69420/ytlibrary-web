"use client";
import { useState } from "react";
import { X, KeyRound, Eye, EyeOff, ExternalLink, Check } from "lucide-react";
import { getApifyToken, setApifyToken } from "@/lib/settings";

interface Props {
  onClose: () => void;
  onSaved?: () => void;
}

export default function SettingsModal({ onClose, onSaved }: Props) {
  const [token, setToken] = useState(getApifyToken());
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApifyToken(token);
    setSaved(true);
    onSaved?.();
    setTimeout(onClose, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 shadow-float animate-slide-up sm:animate-scale-in">
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-text">Settings</h2>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-text p-1 rounded-lg hover:bg-hover transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 safe-bottom">
          <div>
            <label className="text-sm font-medium text-text mb-1 block">Apify API token</label>
            <p className="text-xs text-subtle mb-2.5 leading-relaxed">
              Required to pull video transcripts. Imports run the{" "}
              <span className="text-dim">starvibe/youtube-video-transcript</span> actor (~$0.005 per video,
              i.e. $5 per 1,000). Your token is stored only in this browser and is sent solely to Apify.
            </p>
            <div className="relative">
              <input
                autoFocus
                type={show ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="apify_api_..."
                className="w-full bg-surface border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary/60 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-subtle hover:text-text rounded-lg hover:bg-hover transition-colors"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <a
              href="https://console.apify.com/settings/integrations"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              Get your Apify token <ExternalLink size={11} />
            </a>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-subtle hover:text-text hover:bg-hover rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary hover:bg-primary-dim text-white rounded-xl font-semibold active:scale-[0.98] transition-colors"
            >
              {saved ? <Check size={15} /> : null}
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
