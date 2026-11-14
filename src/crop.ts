import { blurWindows } from "./motionBlur";
import { ZOOM_RAMP, cameraAt, clamp, sourceWindow, type Rect, type Size, type ZoomSegment } from "./layout";

/**
 * Cropping the recording: keep only part of the source video (for example one
 * window out of a full-screen capture). The crop is stored as fractions of the
 * source (0–1 on each axis). Everything that frames the picture (layout,
 * zooms, click-to-aim) works on the cropped view; blur boxes stay in source
 * coordinates, so changing the crop never moves what they hide.
 */
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FULL_CROP: Crop = { x: 0, y: 0, width: 1, height: 1 };

/** Smallest part of the source a crop can keep, per axis. */
export const MIN_CROP = 0.1;
/** Most that can be cut from one edge (matches the sliders): anything that leaves MIN_CROP. */
export const MAX_EDGE = 1 - MIN_CROP;

/** How much is cut from each edge, as fractions of the source. */
export interface CropEdges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type CropEdge = keyof CropEdges;
export const CROP_EDGES: readonly CropEdge[] = ["left", "right", "top", "bottom"];

export function cropEdges(c: Crop): CropEdges {
  return { left: c.x, right: 1 - c.x - c.width, top: c.y, bottom: 1 - c.y - c.height };
}

/** Build a crop from edge amounts; each edge is clamped so at least MIN_CROP stays. */
export function cropFromEdges(e: CropEdges): Crop {
  const left = clamp(finite(e.left), 0, MAX_EDGE);
  const top = clamp(finite(e.top), 0, MAX_EDGE);
  const right = clamp(finite(e.right), 0, Math.min(MAX_EDGE, 1 - MIN_CROP - left));
  const bottom = clamp(finite(e.bottom), 0, Math.min(MAX_EDGE, 1 - MIN_CROP - top));
  return round({ x: left, y: top, width: 1 - left - right, height: 1 - top - bottom });
}

/** Change one edge and keep the others, as a slider does. */
export function setCropEdge(c: Crop, edge: CropEdge, value: number): Crop {
  return cropFromEdges({ ...cropEdges(c), [edge]: value });
}

export function isFullCrop(c: Crop): boolean {
  return c.x <= 0 && c.y <= 0 && c.width >= 1 && c.height >= 1;
}

export function sameCrop(a: Crop, b: Crop): boolean {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.width - b.width) < 1e-6 && Math.abs(a.height - b.height) < 1e-6;
}

/** A crop read from a saved project; anything broken falls back to the whole video. */
export function sanitizeCrop(raw: unknown): Crop {
  if (!raw || typeof raw !== "object") return { ...FULL_CROP };
  const r = raw as Record<string, unknown>;
  const nums = [r.x, r.y, r.width, r.height];
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) return { ...FULL_CROP };
  const [x, y, w, h] = nums as number[];
  return cropFromEdges({ left: x, top: y, right: 1 - x - w, bottom: 1 - y - h });
}

/** The kept part of the source, in source pixels. */
export function cropPixels(source: Size, c: Crop): Rect {
  return { x: c.x * source.width, y: c.y * source.height, width: c.width * source.width, height: c.height * source.height };
}

/** Size of the cropped picture in source pixels: what the layout fits on the canvas. */
export function viewSize(source: Size, c: Crop): Size {
  return { width: c.width * source.width, height: c.height * source.height };
}

/**
 * The source windows to draw for the frame at `time`, in source pixels:
 * the zoom camera works inside the cropped view, then the windows are moved
 * to where that view sits in the source. With motion blur there can be
 * several (oldest first); the last is the frame's own window.
 */
export function viewWindows(source: Size, c: Crop, zooms: readonly ZoomSegment[], time: number, outputWidth: number, motionBlur: boolean, ramp: number = ZOOM_RAMP): Rect[] {
  const view = viewSize(source, c);
  const wins = motionBlur ? blurWindows(view, zooms, time, outputWidth, ramp) : [sourceWindow(view, cameraAt(time, zooms, ramp))];
  const off = cropPixels(source, c);
  return wins.map((w) => ({ x: w.x + off.x, y: w.y + off.y, width: w.width, height: w.height }));
}

/**
 * The crop for a box dragged on the uncropped preview, from two corners in
 * source fractions (any order, clamped to the video). A box thinner than
 * MIN_CROP grows around its middle, staying inside the video.
 */
export function cropFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Crop {
  const span = (p: number, q: number) => {
    let lo = clamp(Math.min(finite(p), finite(q)), 0, 1);
    let hi = clamp(Math.max(finite(p), finite(q)), 0, 1);
    if (hi - lo < MIN_CROP) {
      const mid = clamp((lo + hi) / 2, MIN_CROP / 2, 1 - MIN_CROP / 2);
      lo = mid - MIN_CROP / 2;
      hi = mid + MIN_CROP / 2;
    }
    return [lo, hi] as const;
  };
  const [x0, x1] = span(a.x, b.x);
  const [y0, y1] = span(a.y, b.y);
  return cropFromEdges({ left: x0, right: 1 - x1, top: y0, bottom: 1 - y1 });
}

/** A point in source fractions → fractions of the cropped view, or null when it is cut off. */
export function toView(c: Crop, x: number, y: number): { x: number; y: number } | null {
  const vx = (x - c.x) / c.width;
  const vy = (y - c.y) / c.height;
  if (vx < 0 || vx > 1 || vy < 0 || vy > 1) return null;
  return { x: vx, y: vy };
}

/**
 * Zooms found by scanning the whole source (aimed in source fractions),
 * re-aimed inside the cropped view. Zooms aimed at a cut-off part are dropped.
 */
export function zoomsIntoView(zooms: readonly ZoomSegment[], c: Crop): ZoomSegment[] {
  const out: ZoomSegment[] = [];
  for (const z of zooms) {
    const p = toView(c, z.focusX, z.focusY);
    if (p) out.push({ ...z, focusX: Math.round(p.x * 1000) / 1000, focusY: Math.round(p.y * 1000) / 1000 });
  }
  return out;
}

/** Centre of the cropped view in source fractions (where a new blur box goes). */
export function viewCenter(c: Crop): { x: number; y: number } {
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
}

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function round(c: Crop): Crop {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return { x: r(c.x), y: r(c.y), width: r(c.width), height: r(c.height) };
}
