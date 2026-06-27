import Dexie, { type Table } from "dexie";
import type { Video, Brain, BrainItem, Tag, VideoTag } from "./types";

class YTLibraryDB extends Dexie {
  videos!: Table<Video, string>;
  brains!: Table<Brain, number>;
  brain_items!: Table<BrainItem, number>;
  tags!: Table<Tag, number>;
  video_tags!: Table<VideoTag, [string, number]>;

  constructor() {
    super("YTLibraryDB");
    this.version(1).stores({
      videos: "video_id, channel, added_at",
      brains: "++id, name, updated_at",
      brain_items: "++id, brain_id, video_id, sort_order",
      tags: "++id, &name",
      video_tags: "[video_id+tag_id], video_id, tag_id",
    });
  }
}

export const db = new YTLibraryDB();

// ── Videos ────────────────────────────────────────────────────────────────────

export async function saveVideo(data: Video) {
  await db.videos.put(data);
}

export async function getVideos(opts?: {
  channel?: string;
  search?: string;
  tag?: string;
}): Promise<Video[]> {
  let videos = await db.videos.orderBy("added_at").reverse().toArray();

  if (opts?.channel && opts.channel !== "All") {
    videos = videos.filter((v) => v.channel === opts.channel);
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    videos = videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q)
    );
  }
  if (opts?.tag && opts.tag !== "All") {
    const tag = await db.tags.where("name").equals(opts.tag).first();
    if (!tag || !tag.id) return [];
    const vtRows = await db.video_tags.where("tag_id").equals(tag.id).toArray();
    const taggedIds = new Set(vtRows.map((r) => r.video_id));
    videos = videos.filter((v) => taggedIds.has(v.video_id));
  }
  return videos;
}

export async function getVideo(video_id: string): Promise<Video | undefined> {
  return db.videos.get(video_id);
}

export async function updateVideoTranscript(video_id: string, transcript: string) {
  await db.videos.update(video_id, { transcript });
}

export async function deleteVideo(video_id: string) {
  await db.transaction("rw", db.videos, db.video_tags, db.brain_items, async () => {
    await db.videos.delete(video_id);
    await db.video_tags.where("video_id").equals(video_id).delete();
    await db.brain_items.where("video_id").equals(video_id).delete();
  });
}

export async function getChannels(): Promise<string[]> {
  const videos = await db.videos.toArray();
  const set = new Set(videos.map((v) => v.channel).filter(Boolean));
  return Array.from(set).sort();
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<Tag[]> {
  return db.tags.orderBy("name").toArray();
}

export async function getOrCreateTag(name: string): Promise<number> {
  const existing = await db.tags.where("name").equals(name).first();
  if (existing?.id) return existing.id;
  return db.tags.add({ name });
}

export async function getVideoTags(video_id: string): Promise<string[]> {
  const rows = await db.video_tags.where("video_id").equals(video_id).toArray();
  const tags = await Promise.all(rows.map((r) => db.tags.get(r.tag_id)));
  return tags.filter(Boolean).map((t) => t!.name).sort();
}

export async function setVideoTags(video_id: string, tagNames: string[]) {
  await db.transaction("rw", db.tags, db.video_tags, async () => {
    await db.video_tags.where("video_id").equals(video_id).delete();
    for (const name of tagNames) {
      const tag_id = await getOrCreateTag(name);
      await db.video_tags.put({ video_id, tag_id });
    }
  });
}

export async function deleteTag(tag_id: number) {
  await db.transaction("rw", db.tags, db.video_tags, async () => {
    await db.video_tags.where("tag_id").equals(tag_id).delete();
    await db.tags.delete(tag_id);
  });
}

// ── Brains ────────────────────────────────────────────────────────────────────

export async function getBrains(): Promise<(Brain & { video_count: number })[]> {
  const brains = await db.brains.orderBy("updated_at").reverse().toArray();
  return Promise.all(
    brains.map(async (b) => ({
      ...b,
      video_count: await db.brain_items.where("brain_id").equals(b.id!).count(),
    }))
  );
}

export async function getBrain(brain_id: number): Promise<Brain | undefined> {
  return db.brains.get(brain_id);
}

export async function createBrain(name: string, description = "", token_budget = 150000): Promise<number> {
  const now = new Date().toISOString();
  return db.brains.add({ name, description, token_budget, created_at: now, updated_at: now });
}

export async function updateBrain(brain_id: number, data: Partial<Brain>) {
  await db.brains.update(brain_id, { ...data, updated_at: new Date().toISOString() });
}

export async function deleteBrain(brain_id: number) {
  await db.transaction("rw", db.brains, db.brain_items, async () => {
    await db.brain_items.where("brain_id").equals(brain_id).delete();
    await db.brains.delete(brain_id);
  });
}

export async function getBrainItems(brain_id: number): Promise<(BrainItem & Video)[]> {
  const items = await db.brain_items
    .where("brain_id")
    .equals(brain_id)
    .sortBy("sort_order");
  return Promise.all(
    items.map(async (item) => {
      const video = await db.videos.get(item.video_id);
      return { ...item, ...(video ?? ({} as Video)) };
    })
  );
}

export async function addToBrain(brain_id: number, video_ids: string[]) {
  const maxItem = await db.brain_items
    .where("brain_id")
    .equals(brain_id)
    .sortBy("sort_order");
  let next = maxItem.length > 0 ? maxItem[maxItem.length - 1].sort_order + 1 : 0;
  const now = new Date().toISOString();
  for (const video_id of video_ids) {
    const exists = await db.brain_items
      .where("[brain_id+video_id]")
      .equals([brain_id, video_id])
      .first()
      .catch(() => undefined);
    if (!exists) {
      await db.brain_items.add({ brain_id, video_id, mode: "full", sort_order: next++, added_at: now });
    }
  }
  await db.brains.update(brain_id, { updated_at: now });
}

export async function removeFromBrain(brain_id: number, video_id: string) {
  await db.brain_items
    .where("brain_id").equals(brain_id)
    .and((item) => item.video_id === video_id)
    .delete();
}

export async function updateBrainItem(item_id: number, data: Partial<BrainItem>) {
  await db.brain_items.update(item_id, data);
}

export async function getBrainVideoIds(brain_id: number): Promise<Set<string>> {
  const rows = await db.brain_items.where("brain_id").equals(brain_id).toArray();
  return new Set(rows.map((r) => r.video_id));
}

// ── Import/Export ─────────────────────────────────────────────────────────────

export async function exportAllData() {
  const [videos, brains, brain_items, tags, video_tags] = await Promise.all([
    db.videos.toArray(),
    db.brains.toArray(),
    db.brain_items.toArray(),
    db.tags.toArray(),
    db.video_tags.toArray(),
  ]);
  return { videos, brains, brain_items, tags, video_tags };
}

export async function importAllData(data: Awaited<ReturnType<typeof exportAllData>>) {
  await db.transaction("rw", db.videos, db.brains, db.brain_items, db.tags, db.video_tags, async () => {
    await db.videos.bulkPut(data.videos);
    if (data.brains.length) await db.brains.bulkPut(data.brains);
    if (data.brain_items.length) await db.brain_items.bulkPut(data.brain_items);
    if (data.tags.length) await db.tags.bulkPut(data.tags);
    if (data.video_tags.length) await db.video_tags.bulkPut(data.video_tags);
  });
}
