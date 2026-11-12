/**
 * Blur boxes: rectangles that hide sensitive parts of the recording (emails,
 * names, keys) for the whole clip or for part of it. A box is stored in the source video's own
 * coordinates (0–1 on each axis), so it stays on the same spot of the screen
 * while the camera zooms, and it covers the same pixels in every export.
 */
import { clamp, type Rect, type Size } from "./layout";

export type MaskLook = "pixel" | "solid";
export const MASK_LOOKS: readonly MaskLook[] = ["pixel", "solid"];

export interface Mask {
  /** Top-left corner and size as fractions of the source video. */
  x: number;
  y: number;
  width: number;
  height: number;
  look: MaskLook;
  /** When the box is shown, in source-video seconds; no `time` means the whole clip. */
  time?: { start: number; end: number };
}

/** Shortest time a box can be shown for, in seconds. */
export const MIN_MASK_TIME = 0.2;
const DEFAULT_TIME = 3;

/** Smallest box side, as a fraction of the video. */
export const MIN_MASK = 0.02;
export const MAX_MASKS = 20;
const DEFAULT_W = 0.3;
const DEFAULT_H = 0.1;

/** Keep a box inside the video and at least MIN_MASK on each side. */
export function clampMask(m: Mask): Mask {
  const width = clamp(m.width, MIN_MASK, 1);
  const height = clamp(m.height, MIN_MASK, 1);
  return { ...m, width, height, x: clamp(m.x, 0, 1 - width), y: clamp(m.y, 0, 1 - height) };
}

/** Add a box near the middle, nudged so it does not sit exactly on an earlier one. */
export function addMask(masks: readonly Mask[], look: MaskLook = "pixel"): Mask[] {
  if (masks.length >= MAX_MASKS) return [...masks];
  let x = 0.5 - DEFAULT_W / 2;
  let y = 0.5 - DEFAULT_H / 2;
  for (let n = 0; n < MAX_MASKS && masks.some((m) => Math.abs(m.x - x) < 0.01 && Math.abs(m.y - y) < 0.01); n++) {
    x += 0.04;
    y += 0.06;
    if (y + DEFAULT_H > 1) y = 0.05;
    if (x + DEFAULT_W > 1) x = 0.05;
  }
  return [...masks, clampMask({ x, y, width: DEFAULT_W, height: DEFAULT_H, look })];
}

/** Move a box so its top-left corner is at (x, y), staying inside the video. */
export function moveMask(m: Mask, x: number, y: number): Mask {
  return clampMask({ ...m, x, y });
}

/** Move a box's bottom-right corner to (x, y); the top-left corner stays put. */
export function resizeMask(m: Mask, x: number, y: number): Mask {
  return clampMask({ ...m, width: clamp(x - m.x, MIN_MASK, 1 - m.x), height: clamp(y - m.y, MIN_MASK, 1 - m.y) });
}

/**
 * Where a box lands on the canvas, given the visible part of the video
 * (`win`, in source pixels) and where that part is drawn (`content`).
 */
export function maskRect(m: Mask, source: Size, win: Rect, content: Rect): Rect {
  const sx = content.width / win.width;
  const sy = content.height / win.height;
  return {
    x: content.x + (m.x * source.width - win.x) * sx,
    y: content.y + (m.y * source.height - win.y) * sy,
    width: m.width * source.width * sx,
    height: m.height * source.height * sy,
  };
}

/** The inverse of maskRect for one point: canvas pixels → fractions of the video. */
export function toSource(x: number, y: number, source: Size, win: Rect, content: Rect): { x: number; y: number } {
  return {
    x: (win.x + ((x - content.x) / content.width) * win.width) / source.width,
    y: (win.y + ((y - content.y) / content.height) * win.height) / source.height,
  };
}

/** Pixel block size for the "pixel" look, in canvas pixels. */
export function pixelBlock(canvas: Size): number {
  return Math.max(6, Math.round(Math.min(canvas.width, canvas.height) * 0.022));
}

/** Size of the resize handle drawn on a box in the preview, in canvas pixels. */
export function handleSize(canvas: Size): number {
  return Math.max(14, Math.min(canvas.width, canvas.height) * 0.028);
}

/**
 * Which box (and which part of it) is under a canvas point. Later boxes are
 * drawn on top, so they win. The resize handle sits on the bottom-right corner
 * and reaches a little outside the box.
 */
export function maskHit(rects: readonly Rect[], x: number, y: number, handle: number): { index: number; part: "body" | "corner" } | null {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const cx = r.x + r.width;
    const cy = r.y + r.height;
    if (Math.abs(x - cx) <= handle && Math.abs(y - cy) <= handle) return { index: i, part: "corner" };
    if (x >= r.x && x <= cx && y >= r.y && y <= cy) return { index: i, part: "body" };
  }
  return null;
}

/** Is the box drawn at this source time? */
export function maskShown(m: Mask, time: number): boolean {
  return !m.time || (time >= m.time.start && time < m.time.end);
}

/** Show the box only for a while, starting at the playhead (moved back if the clip ends first). */
export function timeMask(m: Mask, at: number, duration: number): Mask {
  const len = Math.min(DEFAULT_TIME, duration);
  const start = clamp(at, 0, Math.max(0, duration - len));
  return { ...m, time: { start, end: Math.min(duration, start + len) } };
}

/** Show the box for the whole clip again. */
export function untimeMask(m: Mask): Mask {
  const { time: _, ...rest } = m;
  return rest;
}

/** Move one end of a timed box to the playhead, keeping it at least MIN_MASK_TIME long. */
export function setMaskEdge(m: Mask, edge: "start" | "end", at: number, duration: number): Mask {
  if (!m.time) return m;
  const { start, end } = m.time;
  const min = Math.min(MIN_MASK_TIME, duration);
  if (edge === "start") return { ...m, time: { start: clamp(at, 0, Math.max(0, end - min)), end } };
  return { ...m, time: { start, end: clamp(at, Math.min(duration, start + min), duration) } };
}
