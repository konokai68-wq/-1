import type { Size } from "./layout";

/** Look of a text callout drawn over the video. */
export type TextLook = "dark" | "light" | "accent";

/** `arrow` is the solid colour of a callout's arrow; `ink` doubles as its outline. */
export const TEXT_LOOKS: readonly { id: TextLook; label: string; fill: string; ink: string; arrow: string }[] = [
  { id: "dark", label: "Dark", fill: "rgba(14, 18, 28, 0.86)", ink: "#ffffff", arrow: "#141a26" },
  { id: "light", label: "Light", fill: "rgba(255, 255, 255, 0.94)", ink: "#141a26", arrow: "#ffffff" },
  { id: "accent", label: "Blue", fill: "#3150e8", ink: "#ffffff", arrow: "#3150e8" },
];

/** A point as a fraction of the canvas (0–1). */
export interface Point {
  x: number;
  y: number;
}

/** A text callout shown from `start` to `end` (source time, seconds). */
export interface TextNote {
  start: number;
  end: number;
  text: string;
  /** Centre of the callout as a fraction of the canvas (0–1). */
  x: number;
  y: number;
  /** Font size as a fraction of the canvas's shorter side. */
  size: number;
  look: TextLook;
  /** Optional arrow from the callout to this tip. With empty text, a bare arrow. */
  arrow?: Point;
}

export const DEFAULT_TEXT_LENGTH = 3;
export const MIN_TEXT_LENGTH = 0.5;
export const TEXT_SIZES: readonly { label: string; value: number }[] = [
  { label: "S", value: 0.035 },
  { label: "M", value: 0.05 },
  { label: "L", value: 0.07 },
];
/** Fade in and out over this many seconds. */
export const TEXT_FADE = 0.25;
/** Longest a callout may be, as a fraction of the canvas width. */
const MAX_WIDTH = 0.8;

/**
 * Add a callout starting at `t`, like addZoom: DEFAULT_TEXT_LENGTH seconds or
 * up to the next callout / the end of the video. Returns the same list when
 * there is no room.
 */
export function addText(notes: readonly TextNote[], t: number, duration: number, text = "Your text here"): TextNote[] {
  const list = [...notes].sort((a, b) => a.start - b.start);
  if (list.some((n) => t >= n.start && t < n.end)) return list;
  const next = list.find((n) => n.start > t);
  const end = Math.min(t + DEFAULT_TEXT_LENGTH, next ? next.start : Infinity, duration);
  if (end - t < MIN_TEXT_LENGTH) return list;
  list.push({ start: t, end, text, x: 0.5, y: 0.86, size: TEXT_SIZES[1].value, look: "dark" });
  return list.sort((a, b) => a.start - b.start);
}

/** Index of the callout shown at `t`, or -1. */
export function textIndexAt(notes: readonly TextNote[], t: number): number {
  return notes.findIndex((n) => t >= n.start && t < n.end);
}

/** Fade-in / fade-out progress at `t`: 0 (hidden) … 1 (fully shown). */
export function textOpacity(note: TextNote, t: number): number {
  if (t < note.start || t >= note.end) return 0;
  const fade = Math.min(TEXT_FADE, (note.end - note.start) / 2);
  const v = Math.min((t - note.start) / fade, (note.end - t) / fade, 1);
  return v * v * (3 - 2 * v);
}

/**
 * Break `text` into lines no wider than `maxWidth`, using `measure` for the
 * width of a string. Explicit newlines are kept; a single word wider than the
 * limit gets its own line rather than being split.
 */
export function wrapText(text: string, measure: (s: string) => number, maxWidth: number, maxLines = 4): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && measure(next) > maxWidth) {
        out.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  while (out.length > 1 && out[out.length - 1] === "") out.pop();
  if (out.length > maxLines) {
    const kept = out.slice(0, maxLines);
    kept[maxLines - 1] += "…";
    return kept;
  }
  return out;
}

export interface TextLayout {
  /** The pill behind the text, in canvas pixels. */
  box: { x: number; y: number; width: number; height: number };
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

/**
 * Where a callout's pill goes on a canvas of `canvas` size. The pill is centred
 * on (x, y) and pushed back inside the canvas when it would stick out.
 */
export function layoutText(canvas: Size, note: TextNote, measureAt: (fontSize: number) => (s: string) => number): TextLayout {
  const fontSize = Math.max(8, note.size * Math.min(canvas.width, canvas.height));
  const measure = measureAt(fontSize);
  const padX = fontSize * 0.7;
  const padY = fontSize * 0.42;
  const lineHeight = fontSize * 1.25;
  const lines = wrapText(note.text, measure, canvas.width * MAX_WIDTH - padX * 2);
  const textWidth = Math.max(fontSize, ...lines.map(measure));
  const width = Math.min(canvas.width, textWidth + padX * 2);
  const height = Math.min(canvas.height, lines.length * lineHeight + padY * 2);
  const x = clamp(note.x * canvas.width - width / 2, 0, canvas.width - width);
  const y = clamp(note.y * canvas.height - height / 2, 0, canvas.height - height);
  return { box: { x, y, width, height }, lines, fontSize, lineHeight };
}

/** Index of the callout under canvas point (px, py) at time `t`, or -1. */
export function textHit(
  notes: readonly TextNote[],
  t: number,
  canvas: Size,
  px: number,
  py: number,
  measureAt: (fontSize: number) => (s: string) => number,
): number {
  const i = textIndexAt(notes, t);
  if (i < 0) return -1;
  const { box } = layoutText(canvas, notes[i], measureAt);
  const slop = Math.min(canvas.width, canvas.height) * 0.01;
  const inside = px >= box.x - slop && px <= box.x + box.width + slop && py >= box.y - slop && py <= box.y + box.height + slop;
  return inside ? i : -1;
}

/** Keep a dragged callout's centre on the canvas. */
export function moveText(note: TextNote, x: number, y: number): TextNote {
  return { ...note, x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
}

/**
 * Where a new arrow points: a quarter of the canvas from the callout, towards
 * the middle of the picture (up for callouts in the lower half, down otherwise).
 */
export function defaultArrowTip(note: TextNote): Point {
  const dy = note.y > 0.5 ? -0.28 : 0.28;
  const dx = note.x < 0.35 ? 0.15 : note.x > 0.65 ? -0.15 : 0.08;
  return { x: clamp(note.x + dx, 0.03, 0.97), y: clamp(note.y + dy, 0.03, 0.97) };
}

/** Turn a callout's arrow on (pointing at `defaultArrowTip`) or off. */
export function toggleArrow(note: TextNote): TextNote {
  if (note.arrow) {
    const rest = { ...note };
    delete rest.arrow;
    return rest;
  }
  return { ...note, arrow: defaultArrowTip(note) };
}

/** Keep a dragged arrow tip on the canvas. */
export function moveArrowTip(note: TextNote, x: number, y: number): TextNote {
  return { ...note, arrow: { x: clamp(x, 0, 1), y: clamp(y, 0, 1) } };
}

export interface ArrowGeometry {
  /** Tail of the shaft (just outside the callout's pill), in canvas pixels. */
  from: Point;
  /** Where the shaft meets the head. */
  neck: Point;
  /** The head triangle: tip, then the two barbs. */
  head: [Point, Point, Point];
  /** Shaft thickness in pixels. */
  width: number;
}

/**
 * Shape of a callout's arrow on a canvas of `canvas` size. The tail starts on
 * the edge of `box` (the pill, or null when there is no pill: then it starts at
 * the callout's centre). Null when there is no arrow or the tip is too close
 * to draw one.
 */
export function arrowGeometry(canvas: Size, note: TextNote, box: TextLayout["box"] | null): ArrowGeometry | null {
  if (!note.arrow) return null;
  const short = Math.min(canvas.width, canvas.height);
  const fontSize = Math.max(8, note.size * short);
  const width = Math.max(2, fontSize * 0.2);
  const headLength = width * 4.2;
  const tip = { x: note.arrow.x * canvas.width, y: note.arrow.y * canvas.height };
  const c = box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: note.x * canvas.width, y: note.y * canvas.height };
  const dx = tip.x - c.x;
  const dy = tip.y - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return null;
  const ux = dx / dist;
  const uy = dy / dist;
  // Distance from the centre to the pill's edge along the arrow, plus a small gap.
  let start = 0;
  if (box) {
    const tx = Math.abs(ux) > 1e-9 ? box.width / 2 / Math.abs(ux) : Infinity;
    const ty = Math.abs(uy) > 1e-9 ? box.height / 2 / Math.abs(uy) : Infinity;
    start = Math.min(tx, ty) + fontSize * 0.3;
  }
  if (dist - start < headLength * 1.5) return null;
  const from = { x: c.x + ux * start, y: c.y + uy * start };
  const base = { x: tip.x - ux * headLength, y: tip.y - uy * headLength };
  const half = headLength * 0.62;
  const head: [Point, Point, Point] = [
    tip,
    { x: base.x - uy * half, y: base.y + ux * half },
    { x: base.x + uy * half, y: base.y - ux * half },
  ];
  // Stop the shaft inside the head so its round cap never pokes past the barbs.
  const neck = { x: tip.x - ux * headLength * 0.7, y: tip.y - uy * headLength * 0.7 };
  return { from, neck, head, width };
}

/** Index of the callout whose arrow tip is under canvas point (px, py) at `t`, or -1. */
export function arrowTipHit(notes: readonly TextNote[], t: number, canvas: Size, px: number, py: number): number {
  const i = textIndexAt(notes, t);
  const tip = i >= 0 ? notes[i].arrow : undefined;
  if (!tip) return -1;
  const reach = Math.max(12, Math.min(canvas.width, canvas.height) * 0.035);
  return Math.hypot(px - tip.x * canvas.width, py - tip.y * canvas.height) <= reach ? i : -1;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
