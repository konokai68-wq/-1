/**
 * Auto zoom: find moments where only part of the screen changes (a menu opens,
 * text is typed, a button reacts) and suggest a zoom on that spot. Browsers
 * don't give us the cursor position of a screen share, so we look at the
 * pictures instead. Everything here is pure; autoZoomScan.ts feeds it frames.
 */
import type { ZoomSegment } from "./layout";
import type { Span } from "./cuts";

/** Width of the small greyscale frames we compare. */
export const SCAN_WIDTH = 160;
/** How often we sample the clip, in seconds (before capping the count). */
export const SCAN_STEP = 0.25;
export const MAX_SAMPLES = 720;
/** The zoom amounts the inspector offers; suggestions snap to these. */
export const ZOOM_CHOICES = [1.4, 1.8, 2.4] as const;

/** Changed area, 0–1 on each axis of the video frame. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ChangeSample {
  /** Source time of the later frame. */
  t: number;
  /** Share of pixels that changed, 0–1. */
  fraction: number;
  /** Bounding box of the changed pixels, or null when nothing changed. */
  box: Box | null;
}

/** Size of the scan frames for a source of this size (width SCAN_WIDTH, even height). */
export function scanSize(source: { width: number; height: number }): { width: number; height: number } {
  const ratio = source.width > 0 && source.height > 0 ? source.height / source.width : 9 / 16;
  return { width: SCAN_WIDTH, height: Math.max(2, Math.round((SCAN_WIDTH * ratio) / 2) * 2) };
}

/** Luma (0–255) of RGBA pixels. */
export function toLuma(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return out;
}

/**
 * Compare two greyscale frames of `width` × `height`. A pixel counts as changed
 * when its brightness moved by more than `threshold` (video compression noise
 * stays below it). The box ignores lone pixels by needing two changed pixels in
 * a row or column before it grows to cover them.
 */
export function measureChange(prev: Uint8Array, cur: Uint8Array, width: number, height: number, threshold = 24): Omit<ChangeSample, "t"> {
  const cols = new Uint32Array(width);
  const rows = new Uint32Array(height);
  let changed = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const d = cur[row + x] - prev[row + x];
      if (d > threshold || d < -threshold) {
        changed++;
        cols[x]++;
        rows[y]++;
      }
    }
  }
  if (changed === 0) return { fraction: 0, box: null };
  const span = (counts: Uint32Array) => {
    const need = changed >= 4 ? 2 : 1;
    let lo = 0;
    while (lo < counts.length && counts[lo] < need) lo++;
    let hi = counts.length - 1;
    while (hi > lo && counts[hi] < need) hi--;
    if (lo >= counts.length) return null;
    return [lo / counts.length, (hi + 1) / counts.length] as const;
  };
  const xs = span(cols);
  const ys = span(rows);
  return {
    fraction: changed / (width * height),
    box: xs && ys ? { x0: xs[0], y0: ys[0], x1: xs[1], y1: ys[1] } : null,
  };
}

/**
 * Times to sample: every SCAN_STEP seconds inside `range`, skipping cuts, with
 * the step widened so there are at most MAX_SAMPLES of them.
 */
export function scanTimes(range: { start: number; end: number }, cuts: readonly Span[] = []): number[] {
  const kept = Math.max(0, range.end - range.start) - cuts.reduce((sum, c) => sum + Math.max(0, Math.min(c.end, range.end) - Math.max(c.start, range.start)), 0);
  const step = Math.max(SCAN_STEP, kept / MAX_SAMPLES);
  const times: number[] = [];
  for (let t = range.start; t < range.end - 0.02; t += step) {
    if (cuts.some((c) => t >= c.start && t < c.end)) continue;
    times.push(Math.round(t * 1000) / 1000);
  }
  return times;
}

export interface SuggestOptions {
  range: { start: number; end: number };
  /** Zooms already on the timeline; suggestions never overlap them. */
  existing?: readonly ZoomSegment[];
}

const MIN_FRACTION = 0.0002; // less than this is noise (a few pixels)
const MAX_FRACTION = 0.22; // more than this is a page change or a scroll
const MAX_BOX_AREA = 0.3; // a change spread wider than this isn't worth a zoom
const MIN_BOX_AREA = 0.0015;
const JOIN_GAP = 1; // seconds of stillness that still count as the same moment
const SAME_SPOT_GAP = 2.5; // …or longer, when the change is in the same spot (a popup opens, then closes)
const LEAD = 0.5; // start zooming in a little before the change
const HOLD = 1.6; // stay zoomed a while after it settles
const MIN_LENGTH = 2;
const MAX_LENGTH = 8;

const area = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0);
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const union = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

/** The largest offered zoom that keeps the whole box in view with some margin. */
export function scaleFor(box: Box): number {
  const fit = 0.7 / Math.max(box.x1 - box.x0, box.y1 - box.y0, 1e-6);
  let pick: number = ZOOM_CHOICES[0];
  for (const s of ZOOM_CHOICES) if (s <= fit) pick = s;
  return pick;
}

interface Run {
  first: number;
  last: number;
  box: Box;
}

/**
 * Turn change samples (sorted by time) into zoom suggestions. Nearby local
 * changes join into one moment; big changes (a new page) end the moment. Each
 * moment becomes a zoom on its changed area, from a little before it starts to
 * a little after it ends. The result is sorted and never overlaps `existing`
 * or itself; `existing` is not included.
 */
export function suggestZooms(samples: readonly ChangeSample[], opts: SuggestOptions): ZoomSegment[] {
  const runs: Run[] = [];
  let run: Run | null = null;
  const close = () => {
    if (run && area(run.box) >= MIN_BOX_AREA) runs.push(run);
    run = null;
  };
  for (const s of samples) {
    if (s.fraction > MAX_FRACTION) {
      close();
      continue;
    }
    if (s.fraction < MIN_FRACTION || !s.box || area(s.box) > MAX_BOX_AREA) continue;
    const gap = run ? s.t - run.last : Infinity;
    if (run && (gap <= JOIN_GAP || (gap <= SAME_SPOT_GAP && overlaps(run.box, s.box))) && area(union(run.box, s.box)) <= MAX_BOX_AREA) {
      run.last = s.t;
      run.box = union(run.box, s.box);
    } else {
      close();
      run = { first: s.t, last: s.t, box: s.box };
    }
  }
  close();

  const { range } = opts;
  const taken = [...(opts.existing ?? [])].sort((a, b) => a.start - b.start);
  const out: ZoomSegment[] = [];
  for (const r of runs) {
    const floor = Math.max(range.start, out.length ? out[out.length - 1].end : -Infinity);
    let start = Math.max(floor, r.first - LEAD);
    let end = Math.min(range.end, Math.max(r.last + HOLD, start + MIN_LENGTH), start + MAX_LENGTH);
    // Near the end of the clip, start earlier rather than make a short zoom.
    if (end - start < MIN_LENGTH) start = Math.max(floor, end - MIN_LENGTH);
    for (const z of taken) {
      if (z.end <= start || z.start >= end) continue;
      // Keep whichever side of the existing zoom has the change in it.
      if (z.start <= r.first) start = Math.max(start, z.end);
      else end = Math.min(end, z.start);
    }
    if (end - start < MIN_LENGTH * 0.75) continue;
    out.push({
      start: round(start),
      end: round(end),
      scale: scaleFor(r.box),
      focusX: round((r.box.x0 + r.box.x1) / 2),
      focusY: round((r.box.y0 + r.box.y1) / 2),
    });
  }
  return out;
}

const round = (v: number) => Math.round(v * 1000) / 1000;
