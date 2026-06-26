"use client";
import { Library, Brain, Tag, ChevronRight, Plus, Trash2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Brain as BrainType, Tag as TagType } from "@/lib/types";

export type View = "library" | { type: "brain"; id: number } | { type: "tag"; name: string } | { type: "channel"; name: string };

interface Props {
  channels: string[];
  tags: TagType[];
  brains: (BrainType & { video_count: number })[];
  activeView: View;
  onViewChange: (view: View) => void;
  onCreateBrain: () => void;
  onDeleteBrain: (id: number) => void;
}

export default function Sidebar({
  channels, tags, brains, activeView, onViewChange, onCreateBrain, onDeleteBrain,
}: Props) {
  const isLib = activeView === "library";

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-surface-raised border-r border-surface-border h-full overflow-y-auto">
      {/* Library */}
      <div className="px-3 pt-4 pb-2">
        <NavItem
          icon={<Library size={15} />}
          label="Library"
          active={isLib}
          onClick={() => onViewChange("library")}
        />
      </div>

      {/* Channels */}
      {channels.length > 0 && (
        <Section label="Channels">
          {channels.map((ch) => (
            <NavItem
              key={ch}
              icon={<Hash size={13} className="shrink-0" />}
              label={ch}
              active={typeof activeView === "object" && activeView.type === "channel" && activeView.name === ch}
              onClick={() => onViewChange({ type: "channel", name: ch })}
            />
          ))}
        </Section>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <Section label="Tags">
          {tags.map((t) => (
            <NavItem
              key={t.id}
              icon={<Tag size={12} className="shrink-0" />}
              label={t.name}
              active={typeof activeView === "object" && activeView.type === "tag" && activeView.name === t.name}
              onClick={() => onViewChange({ type: "tag", name: t.name })}
            />
          ))}
        </Section>
      )}

      {/* Brains */}
      <Section
        label="Brains"
        action={
          <button
            onClick={onCreateBrain}
            className="p-0.5 rounded hover:bg-surface-hover text-gray-500 hover:text-gray-200 transition-colors"
          >
            <Plus size={13} />
          </button>
        }
      >
        {brains.length === 0 ? (
          <p className="text-[11px] text-gray-600 px-2 py-1">No brains yet</p>
        ) : (
          brains.map((b) => (
            <div key={b.id} className="group flex items-center">
              <NavItem
                icon={<Brain size={13} className="shrink-0" />}
                label={b.name}
                badge={b.video_count}
                active={typeof activeView === "object" && activeView.type === "brain" && activeView.id === b.id}
                onClick={() => onViewChange({ type: "brain", id: b.id! })}
                className="flex-1 min-w-0"
              />
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteBrain(b.id!); }}
                className="hidden group-hover:flex p-1 mr-1 text-gray-600 hover:text-red-400 rounded transition-colors shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </Section>
    </aside>
  );
}

function Section({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</span>
        {action}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  icon, label, active, onClick, badge, className,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors truncate",
        active
          ? "bg-brand/20 text-blue-300"
          : "text-gray-400 hover:text-gray-100 hover:bg-surface-hover",
        className
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] text-gray-500 shrink-0">{badge}</span>
      )}
    </button>
  );
}
