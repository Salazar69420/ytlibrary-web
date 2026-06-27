"use client";
import { useState, useRef } from "react";
import { Check, Clock, Eye } from "lucide-react";
import { formatDuration, formatViews, cn } from "@/lib/utils";
import type { Video } from "@/lib/types";

interface Props {
  video: Video;
  tags?: string[];
  selected?: boolean;
  selectMode?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onLongPress?: () => void;
  onQuickSelect?: () => void;
}

export default function VideoCard({ video, tags = [], selected, selectMode, onClick, onLongPress, onQuickSelect }: Props) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const thumb = !imgError && video.thumbnail_url
    ? video.thumbnail_url
    : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  const handleTouchStart = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress?.();
      setPressing(false);
    }, 450);
    setPressing(true);
  };

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setPressing(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Swallow the click that follows a long-press so it doesn't also open detail.
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onClick(e);
  };

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearPress}
      onTouchMove={clearPress}
      onTouchCancel={clearPress}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none",
        "bg-card border transition-all duration-150 ease-out-soft shadow-card",
        selected
          ? "border-primary ring-2 ring-primary/40"
          : "border-border hover:border-muted hover:shadow-card-hover hover:-translate-y-0.5",
        (pressing || selected) && "scale-[0.98]"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface overflow-hidden">
        {!imgLoaded && <div className="absolute inset-0 skeleton" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={video.title}
          onError={() => { setImgError(true); setImgLoaded(true); }}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-300 ease-out-soft",
            imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            "group-hover:scale-[1.03]"
          )}
          loading="lazy"
        />
        {/* Select overlay tint */}
        {selectMode && (
          <div className={cn(
            "absolute inset-0 transition-colors duration-150",
            selected ? "bg-primary/25" : "bg-black/0"
          )} />
        )}
        {/* Duration badge */}
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {/* Select checkbox — always visible while in select mode */}
        {selectMode && (
          <div className={cn(
            "absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ease-out-soft",
            selected
              ? "bg-primary border-primary scale-110"
              : "bg-black/50 border-white/70 backdrop-blur-sm"
          )}>
            {selected && <Check size={11} className="text-white animate-pop-in" strokeWidth={3} />}
          </div>
        )}
        {/* Desktop hover quick-select — enters select mode without long-press */}
        {!selectMode && onQuickSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickSelect(); }}
            aria-label="Select video"
            className="hidden md:flex absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-white/70 bg-black/50 backdrop-blur-sm items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary transition-all duration-150"
          >
            <Check size={11} className="text-white" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-[13px] font-medium text-text clamp-2 leading-snug">{video.title}</p>
        <p className="text-[11px] text-subtle truncate">{video.channel}</p>

        {(video.view_count || video.upload_date) && (
          <div className="flex items-center gap-2 text-[10px] text-dim mt-0.5">
            {video.view_count ? (
              <span className="flex items-center gap-0.5">
                <Eye size={9} />{formatViews(video.view_count)}
              </span>
            ) : null}
            {video.upload_date ? (
              <span className="flex items-center gap-0.5">
                <Clock size={9} />{video.upload_date.slice(0, 4)}
              </span>
            ) : null}
          </div>
        )}

        {tags.length > 0 && !selectMode && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {tags.length > 2 && <span className="text-[9px] text-dim">+{tags.length - 2}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
