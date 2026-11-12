import { WINDOW_CHROMES, type WindowChrome } from "./layout";

/**
 * A saved look: the styling of a clip (backdrop, canvas, frame, window bar)
 * without any of its timeline edits, so it can be put on the next clip in
 * one click. Kept in localStorage as plain JSON.
 */
export interface Look {
  id: string;
  name: string;
  aspect: string;
  frame: { padding: number; radius: number; shadow: number };
  chrome: WindowChrome;
  /**
   * Gradient or solid colour. Image backdrops are not stored (they can be
   * megabytes), so a look made on an image keeps whatever backdrop is active.
   */
  backdrop: LookBackdrop | null;
}

export type LookBackdrop = { kind: "gradient"; id: string } | { kind: "solid"; color: string };

export const MAX_LOOKS = 8;
export const LOOKS_KEY = "panreel.looks";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const HEX = /^#[0-9a-f]{6}$/i;

function readBackdrop(raw: unknown): LookBackdrop | null {
  if (!isObj(raw)) return null;
  if (raw.kind === "gradient" && typeof raw.id === "string" && raw.id) return { kind: "gradient", id: raw.id };
  if (raw.kind === "solid" && typeof raw.color === "string" && HEX.test(raw.color)) return { kind: "solid", color: raw.color.toLowerCase() };
  return null;
}

/** One look from storage, or null when it is too broken to use. */
function readLook(raw: unknown, defaults: Look["frame"]): Look | null {
  if (!isObj(raw) || typeof raw.id !== "string" || !raw.id || typeof raw.aspect !== "string") return null;
  const f = isObj(raw.frame) ? raw.frame : {};
  return {
    id: raw.id.slice(0, 40),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : "Look",
    aspect: raw.aspect,
    frame: {
      padding: num(f.padding) ? clamp(f.padding, 0, 0.3) : defaults.padding,
      radius: num(f.radius) ? clamp(f.radius, 0, 0.08) : defaults.radius,
      shadow: num(f.shadow) ? clamp(f.shadow, 0, 1) : defaults.shadow,
    },
    chrome: WINDOW_CHROMES.includes(raw.chrome as WindowChrome) ? (raw.chrome as WindowChrome) : "none",
    backdrop: readBackdrop(raw.backdrop),
  };
}

/** Whatever came out of localStorage, as at most MAX_LOOKS usable looks with unique ids. */
export function sanitizeLooks(raw: unknown, defaults: Look["frame"]): Look[] {
  if (!Array.isArray(raw)) return [];
  const out: Look[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    const look = readLook(item, defaults);
    if (!look || ids.has(look.id)) continue;
    ids.add(look.id);
    out.push(look);
    if (out.length === MAX_LOOKS) break;
  }
  return out;
}

/** True when two looks would style a clip the same way (names and ids aside). */
export function sameStyle(a: Omit<Look, "id" | "name">, b: Omit<Look, "id" | "name">): boolean {
  const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
  const bd = (x: LookBackdrop | null, y: LookBackdrop | null) =>
    x === null || y === null ? x === y : x.kind === "gradient" ? y.kind === "gradient" && x.id === y.id : y.kind === "solid" && x.color.toLowerCase() === y.color.toLowerCase();
  return (
    a.aspect === b.aspect &&
    a.chrome === b.chrome &&
    near(a.frame.padding, b.frame.padding) &&
    near(a.frame.radius, b.frame.radius) &&
    near(a.frame.shadow, b.frame.shadow) &&
    bd(a.backdrop, b.backdrop)
  );
}

/** The first "Look N" name that is not taken yet (N from 1). `word` is the translated "Look". */
export function nextLookName(looks: readonly Pick<Look, "name">[], word: string): string {
  const taken = new Set(looks.map((l) => l.name));
  for (let n = 1; ; n++) {
    const name = `${word} ${n}`;
    if (!taken.has(name)) return name;
  }
}

export type AddResult = { looks: Look[]; added: Look | null; existing: Look | null };

/**
 * Add `style` as a new look at the end. Nothing changes when an identical
 * look is already saved (`existing` says which) or the list is full.
 */
export function addLook(looks: readonly Look[], style: Omit<Look, "id" | "name">, id: string, word: string): AddResult {
  const existing = looks.find((l) => sameStyle(l, style)) ?? null;
  if (existing || looks.length >= MAX_LOOKS) return { looks: [...looks], added: null, existing };
  const added: Look = { ...style, frame: { ...style.frame }, id, name: nextLookName(looks, word) };
  return { looks: [...looks, added], added, existing: null };
}

export function removeLook(looks: readonly Look[], id: string): Look[] {
  return looks.filter((l) => l.id !== id);
}

/** CSS background for a look's chip: the gradient, the colour, or a checker for "keeps the current backdrop". */
export function lookSwatch(look: Pick<Look, "backdrop">, gradients: readonly { id: string; stops: readonly string[] }[]): string {
  const b = look.backdrop;
  if (b?.kind === "solid") return b.color;
  const g = b?.kind === "gradient" ? gradients.find((x) => x.id === b.id) : undefined;
  if (g) return `linear-gradient(135deg, ${g.stops.join(", ")})`;
  return "repeating-conic-gradient(#8a8f99 0 25%, #c9ccd2 0 50%) 0 0 / 8px 8px";
}
