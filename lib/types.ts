export interface Video {
  video_id: string;
  url: string;
  title: string;
  channel: string;
  channel_id?: string;
  upload_date?: string;
  duration?: number;
  view_count?: number;
  thumbnail_url?: string;
  transcript?: string;
  added_at: string;
}

export interface Brain {
  id?: number;
  name: string;
  description?: string;
  token_budget: number;
  created_at: string;
  updated_at: string;
}

export interface BrainItem {
  id?: number;
  brain_id: number;
  video_id: string;
  mode: "full" | "summary";
  summary?: string;
  sort_order: number;
  added_at: string;
}

export interface Tag {
  id?: number;
  name: string;
}

export interface VideoTag {
  video_id: string;
  tag_id: number;
}
