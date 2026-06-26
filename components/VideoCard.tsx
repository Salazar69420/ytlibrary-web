"use client";
import { useState } from "react";
import { Clock, Eye, Tag } from "lucide-react";
import { formatDuration, formatViews, formatDate, cn } from "@/lib/utils";
import type { Video } from "@/lib/types";

interface Props {
  video: Video;
  tags?: string[];
  selected?: boolean;
  onClick: () => void;
}

export default function VideoCard({ video, tags = [], selected, onClick }: Props) {
  const [imgError, setImgError] = useState(false);
  const thumb =
    !imgError && video.thumbnail_url
      ? video.thumbnail_url
      : `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-xl overflow-hidden cursor-pointer",
        "bg-surface-card border transition-all duration-150",
        selected
          ? "border-brand ring-1 ring-brand"
          : "border-surface-border hover:border-surface-hover hover:scale-[1.02]"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-surface-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={video.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-mono px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-medium line-clamp-2 text-gray-100 leading-snug">
          {video.title}
        </h3>
        <p className="text-xs text-gray-400 truncate">{video.channel}</p>

        <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto pt-1">
          {video.view_count ? (
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {formatViews(video.view_count)}
            </span>
          ) : null}
          {video.upload_date ? (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDate(video.upload_date)}
            </span>
          ) : null}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="flex items-center gap-0.5 text-[10px] bg-brand-muted text-blue-300 px-1.5 py-0.5 rounded-full"
              >
                <Tag size={9} />
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-gray-500">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
