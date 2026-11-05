import type { ZoomSegment } from "./layout";

export const DEFAULT_ZOOM_LENGTH = 3;
export const DEFAULT_ZOOM_SCALE = 1.8;
export const MIN_ZOOM_LENGTH = 0.5;

/**
 * Add a zoom starting at `t`. It runs for DEFAULT_ZOOM_LENGTH seconds, or less
 * if it would overlap the next zoom or pass the end of the video. Returns the
 * same list when there is no room (for example, `t` is inside another zoom).
 */
export function addZoom(segments: readonly ZoomSegment[], t: number, duration: number): ZoomSegment[] {
  const list = [...segments].sort((a, b) => a.start - b.start);
  if (list.some((s) => t >= s.start && t < s.end)) return list;
  const next = list.find((s) => s.start > t);
  const end = Math.min(t + DEFAULT_ZOOM_LENGTH, next ? next.start : Infinity, duration);
  if (end - t < MIN_ZOOM_LENGTH) return list;
  list.push({ start: t, end, scale: DEFAULT_ZOOM_SCALE, focusX: 0.5, focusY: 0.5 });
  return list.sort((a, b) => a.start - b.start);
}

/** Index of the zoom covering time `t`, or -1. */
export function zoomIndexAt(segments: readonly ZoomSegment[], t: number): number {
  return segments.findIndex((s) => t >= s.start && t <= s.end);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
