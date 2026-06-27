"use client";
import { useState } from "react";
import { Check, Clock, Eye } from "lucide-react";
import { formatDuration, formatViews, cn } from "@/lib/utils";
import type { Video } from "@/lib/types";

interface Props {
  video: Video;
  tags?: string[];
  selected?: boolean;
  selectMode?: boolean;
  onClick: () => void;
  onLongPress?: () => void;
}

export default function VideoCard({ video, tags = [], selected, selectMode, onClick, onLongPress }: Props) {
  const [imgError, setImgError] = useState(false);
  const [pressing, setPressing] = useState(false);
  let pressTimer: ReturnType<typeof setTimeout>;

  const thumb = !imgError && video.thumbnail_url
    ? video.thumbnail_url
    : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  const handleTouchStart = () => {
    pressTimer = setTimeout(() => {
      onLongPress?.();
      setPressing(false);
    }, 500);
    setPressing(true);
  };

  const handleTouchEnd = () => {
    clearTimeout(pressTimer);
    setPressing(false);
  };

  return (
    <div
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none",
        "bg-card border transition-all duration-150",
        selected
          ? "border-primary ring-2 ring-primary/30 scale-[0.97]"
          : "border-border hover:border-muted active:scale-[0.97]",
        pressing && "scale-[0.97]"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={video.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Select overlay */}
        {selectMode && (
          <div className={cn(
            "absolute inset-0 transition-colors duration-150",
            selected ? "bg-primary/20" : "bg-black/0"
          )} />
        )}
        {/* Duration badge */}
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {/* Select checkbox */}
        {selectMode && (
          <div className={cn(
            "absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
            selected
              ? "bg-primary border-primary"
              : "bg-black/40 border-white/60"
          )}>
            {selected && <Check size={11} className="text-white" strokeWidth={3} />}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-[13px] font-medium text-[#f2f2f7] clamp-2 leading-snug">{video.title}</p>
        <p className="text-[11px] text-subtle truncate">{video.channel}</p>

        {(video.view_count || video.upload_date) && (
          <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
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
              <span key={t} className="text-[9px] bg-primary/15 text-primary/80 px-1.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {tags.length > 2 && <span className="text-[9px] text-muted">+{tags.length - 2}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
