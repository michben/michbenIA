export type VideoType = "YAPPER" | "SLIDESHOW";
export type VideoStatus = "QUEUED" | "RENDERING" | "READY" | "FAILED";
export type Platform = "TIKTOK" | "INSTAGRAM";
export type PostStatus = "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
export type Plan = "FREE" | "HOBBY" | "PRO" | "ENTERPRISE";

export interface Slide {
  title: string;
  text: string;
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
