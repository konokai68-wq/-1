import type { Bubble, BubbleShape, Corner } from "./camera";
import { SPEED_RATES, type Span, type SpeedSpan } from "./cuts";
import { WINDOW_CHROMES, type WindowChrome, type ZoomSegment } from "./layout";
import { MASK_LOOKS, MAX_MASKS, clampMask, type Mask, type MaskLook } from "./masks";
import type { TextLook, TextNote } from "./texts";
import type { Trim } from "./trim";
import { translate, type Key, type Lang } from "./i18n";

/**
 * Everything needed to reopen an edit, as plain JSON. The videos and the
 * backdrop image are stored next to it as Blobs (see projectStore.ts).
 */
export interface ProjectData {
  version: 1;
  /** File name of the screen video, or a label for a fresh recording. */
  name: string;
  /** Length of the screen video in seconds, used to clamp everything else. */
  duration: number;
  aspect: string;
  frame: { padding: number; radius: number; shadow: number };
  /** Window title bar; missing in projects saved before it existed. */
  chrome: WindowChrome;
  backdrop: SavedBackdrop;
  bubble: Bubble;
  zooms: ZoomSegment[];
  trim: Trim;
  cuts: Span[];
  speeds: SpeedSpan[];
  texts: TextNote[];
  /** Blur boxes; missing in projects saved before they existed. */
  masks: Mask[];
}

export type SavedBackdrop = { kind: "gradient"; id: string } | { kind: "solid"; color: string } | { kind: "image"; blur: number };

export const PROJECT_VERSION = 1;

const SHAPES: readonly BubbleShape[] = ["circle", "rounded"];
const CORNERS: readonly Corner[] = ["tl", "tr", "bl", "br"];
const LOOKS: readonly TextLook[] = ["dark", "light", "accent"];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const unit = (v: unknown, fallback: number) => (num(v) ? clamp(v, 0, 1) : fallback);

/** A span clamped into [0, duration]; null when it is missing or empty. */
function span(raw: unknown, duration: number): Span | null {
  if (!isObj(raw) || !num(raw.start) || !num(raw.end)) return null;
  const start = clamp(raw.start, 0, duration);
  const end = clamp(raw.end, 0, duration);
  return end > start ? { start, end } : null;
}

function list<T>(raw: unknown, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    const v = read(item);
    if (v) out.push(v);
  }
  return out;
}

const byStart = <T extends Span>(a: T, b: T) => a.start - b.start;

/**
 * Turn whatever came out of storage into a project the editor can trust, or
 * null when it is not a Panreel project at all. Unknown or broken parts fall
 * back to defaults instead of failing the whole project.
 */
export function sanitizeProject(raw: unknown, defaults: { aspect: string; bubble: Bubble; frame: ProjectData["frame"] }): ProjectData | null {
  if (!isObj(raw) || raw.version !== PROJECT_VERSION || !num(raw.duration) || raw.duration <= 0) return null;
  const duration = raw.duration;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.slice(0, 200) : "Untitled";
  const aspect = typeof raw.aspect === "string" ? raw.aspect : defaults.aspect;

  const f = isObj(raw.frame) ? raw.frame : {};
  const frame = {
    padding: num(f.padding) ? clamp(f.padding, 0, 0.3) : defaults.frame.padding,
    radius: num(f.radius) ? clamp(f.radius, 0, 0.08) : defaults.frame.radius,
    shadow: unit(f.shadow, defaults.frame.shadow),
  };

  const chrome = WINDOW_CHROMES.includes(raw.chrome as WindowChrome) ? (raw.chrome as WindowChrome) : "none";

  const b = isObj(raw.backdrop) ? raw.backdrop : {};
  let backdrop: SavedBackdrop = { kind: "gradient", id: "" };
  if (b.kind === "gradient" && typeof b.id === "string") backdrop = { kind: "gradient", id: b.id };
  else if (b.kind === "solid" && typeof b.color === "string" && /^#[0-9a-f]{6}$/i.test(b.color)) backdrop = { kind: "solid", color: b.color };
  else if (b.kind === "image") backdrop = { kind: "image", blur: num(b.blur) ? clamp(b.blur, 0, 0.04) : 0 };

  const c = isObj(raw.bubble) ? raw.bubble : {};
  const bubble: Bubble = {
    visible: typeof c.visible === "boolean" ? c.visible : defaults.bubble.visible,
    shape: SHAPES.includes(c.shape as BubbleShape) ? (c.shape as BubbleShape) : defaults.bubble.shape,
    size: num(c.size) ? clamp(c.size, 0.12, 0.45) : defaults.bubble.size,
    corner: CORNERS.includes(c.corner as Corner) ? (c.corner as Corner) : defaults.bubble.corner,
    mirror: typeof c.mirror === "boolean" ? c.mirror : defaults.bubble.mirror,
  };

  const zooms = list<ZoomSegment>(raw.zooms, (z) => {
    const s = span(z, duration);
    if (!s || !isObj(z) || !num(z.scale)) return null;
    return { ...s, scale: clamp(z.scale, 1, 4), focusX: unit(z.focusX, 0.5), focusY: unit(z.focusY, 0.5) };
  }).sort(byStart);

  const trim = span(raw.trim, duration) ?? { start: 0, end: duration };
  const cuts = list(raw.cuts, (s) => span(s, duration)).sort(byStart);
  const speeds = list<SpeedSpan>(raw.speeds, (s) => {
    const sp = span(s, duration);
    if (!sp || !isObj(s) || !SPEED_RATES.includes(s.rate as (typeof SPEED_RATES)[number])) return null;
    return { ...sp, rate: s.rate as number };
  }).sort(byStart);

  const texts = list<TextNote>(raw.texts, (n) => {
    const s = span(n, duration);
    if (!s || !isObj(n) || typeof n.text !== "string") return null;
    const note: TextNote = {
      ...s,
      text: n.text.slice(0, 500),
      x: unit(n.x, 0.5),
      y: unit(n.y, 0.5),
      size: num(n.size) ? clamp(n.size, 0.01, 0.2) : 0.05,
      look: LOOKS.includes(n.look as TextLook) ? (n.look as TextLook) : "dark",
    };
    if (isObj(n.arrow) && num(n.arrow.x) && num(n.arrow.y)) note.arrow = { x: unit(n.arrow.x, 0.5), y: unit(n.arrow.y, 0.5) };
    return note;
  }).sort(byStart);

  const masks = list<Mask>(raw.masks, (m) => {
    if (!isObj(m) || !num(m.x) || !num(m.y) || !num(m.width) || !num(m.height)) return null;
    const look = MASK_LOOKS.includes(m.look as MaskLook) ? (m.look as MaskLook) : "pixel";
    const box = clampMask({ x: m.x, y: m.y, width: m.width, height: m.height, look });
    const time = m.time === undefined ? null : span(m.time, duration);
    return time ? { ...box, time } : box;
  }).slice(0, MAX_MASKS);

  return { version: PROJECT_VERSION, name, duration, aspect, frame, chrome, backdrop, bubble, zooms, trim, cuts, speeds, texts, masks };
}

/** "3 zooms · 1 cut · 2 texts · 1 blur box", or "" when nothing has been added yet. */
export function editSummary(p: Pick<ProjectData, "zooms" | "cuts" | "speeds" | "texts"> & { masks?: readonly Mask[] }, lang: Lang = "en"): string {
  const parts: [number, Key, Key][] = [
    [p.zooms.length, "sum.zoom", "sum.zooms"],
    [p.cuts.length, "sum.cut", "sum.cuts"],
    [p.speeds.length, "sum.speed", "sum.speeds"],
    [p.texts.length, "sum.text", "sum.texts"],
    [p.masks?.length ?? 0, "sum.mask", "sum.masks"],
  ];
  return parts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => translate(lang, n === 1 ? one : many, { n }))
    .join(" · ");
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(savedAt: number, now: number, lang: Lang = "en"): string {
  const s = Math.max(0, (now - savedAt) / 1000);
  if (s < 60) return translate(lang, "ago.now");
  const m = Math.floor(s / 60);
  if (m < 60) return translate(lang, "ago.min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 48) return translate(lang, "ago.h", { n: h });
  return translate(lang, "ago.days", { n: Math.floor(h / 24) });
}
