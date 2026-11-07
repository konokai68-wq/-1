/**
 * Timeline edits on the source clip: cuts (parts left out of the result) and
 * speed-ups (parts played faster). Times are on the source timeline; the
 * "output" timeline is what remains of the trimmed range once the cuts are
 * removed and the speed-ups squeezed, starting at zero. A cut wins over a
 * speed-up where they overlap.
 */
export interface Span {
  start: number;
  end: number;
}

export const DEFAULT_CUT_LENGTH = 1;
export const MIN_CUT_LENGTH = 0.2;

/** A part of the source played `rate` times faster. */
export interface SpeedSpan extends Span {
  rate: number;
}

export const SPEED_RATES = [2, 4, 8] as const;
export const DEFAULT_SPEED_RATE = 4;
export const DEFAULT_SPEED_LENGTH = 2;
export const MIN_SPEED_LENGTH = 0.5;

/** A kept part of the source and how fast it plays. */
export interface Piece extends Span {
  rate: number;
}

/**
 * Add a cut starting at `t`. It runs for DEFAULT_CUT_LENGTH seconds, or less if
 * it would reach the next cut or the end of the video. Returns the same list
 * (sorted) when there is no room.
 */
export function addCut(cuts: readonly Span[], t: number, duration: number): Span[] {
  return addSpan(cuts, { start: t, end: t + DEFAULT_CUT_LENGTH }, duration, MIN_CUT_LENGTH);
}

/**
 * Add a speed-up starting at `t` (DEFAULT_SPEED_LENGTH seconds, shortened to
 * fit before the next speed-up or the end). Same list when there is no room.
 */
export function addSpeed(speeds: readonly SpeedSpan[], t: number, duration: number, rate = DEFAULT_SPEED_RATE): SpeedSpan[] {
  return addSpan(speeds, { start: t, end: t + DEFAULT_SPEED_LENGTH, rate }, duration, MIN_SPEED_LENGTH);
}

function addSpan<T extends Span>(spans: readonly T[], span: T, duration: number, minLength: number): T[] {
  const list = [...spans].sort((a, b) => a.start - b.start);
  const t = span.start;
  if (list.some((c) => t >= c.start && t < c.end)) return list;
  const next = list.find((c) => c.start > t);
  const end = Math.min(span.end, next ? next.start : Infinity, duration);
  if (end - t < minLength) return list;
  list.push({ ...span, end });
  return list.sort((a, b) => a.start - b.start);
}

/** Index of the cut (or any span) covering source time `t` (start inclusive, end exclusive), or -1. */
export function cutIndexAt(cuts: readonly Span[], t: number): number {
  return cuts.findIndex((c) => t >= c.start && t < c.end);
}

/** Where playback should be: past any cut covering `t` (cuts may touch). */
export function skipCuts(cuts: readonly Span[], t: number): number {
  for (let i = cutIndexAt(cuts, t); i >= 0; i = cutIndexAt(cuts, t)) t = cuts[i].end;
  return t;
}

/** The parts of `range` that survive the cuts, in order. */
export function keptSpans(range: Span, cuts: readonly Span[]): Span[] {
  const sorted = [...cuts].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  let at = range.start;
  for (const c of sorted) {
    if (c.end <= at) continue;
    if (c.start >= range.end) break;
    if (c.start > at) out.push({ start: at, end: c.start });
    at = Math.max(at, c.end);
  }
  if (at < range.end) out.push({ start: at, end: range.end });
  return out;
}

/** The kept parts of `range`, split where the playback rate changes. */
export function pieces(range: Span, cuts: readonly Span[], speeds: readonly SpeedSpan[] = []): Piece[] {
  const sorted = [...speeds].sort((a, b) => a.start - b.start);
  const out: Piece[] = [];
  for (const k of keptSpans(range, cuts)) {
    let at = k.start;
    for (const s of sorted) {
      if (s.end <= at) continue;
      if (s.start >= k.end) break;
      if (s.start > at) out.push({ start: at, end: s.start, rate: 1 });
      const end = Math.min(s.end, k.end);
      out.push({ start: Math.max(at, s.start), end, rate: s.rate });
      at = end;
    }
    if (at < k.end) out.push({ start: at, end: k.end, rate: 1 });
  }
  return out;
}

/** Length of the result, in seconds. */
export function keptDuration(range: Span, cuts: readonly Span[], speeds: readonly SpeedSpan[] = []): number {
  return pieces(range, cuts, speeds).reduce((sum, p) => sum + (p.end - p.start) / p.rate, 0);
}

/** Playback rate at source time `t` (1 outside speed-ups). */
export function rateAt(speeds: readonly SpeedSpan[], t: number): number {
  const i = cutIndexAt(speeds, t);
  return i >= 0 ? speeds[i].rate : 1;
}

/** Map a source time to the output timeline, or null when it is trimmed or cut away. */
export function toOutputTime(range: Span, cuts: readonly Span[], t: number, speeds: readonly SpeedSpan[] = []): number | null {
  let o = 0;
  for (const p of pieces(range, cuts, speeds)) {
    if (t < p.start) return null;
    if (t < p.end) return o + (t - p.start) / p.rate;
    o += (p.end - p.start) / p.rate;
  }
  return null;
}

/** Map an output time back to the source timeline (clamped to the result). */
export function toSourceTime(range: Span, cuts: readonly Span[], o: number, speeds: readonly SpeedSpan[] = []): number {
  const list = pieces(range, cuts, speeds);
  for (const p of list) {
    const len = (p.end - p.start) / p.rate;
    if (o < len) return p.start + Math.max(0, o) * p.rate;
    o -= len;
  }
  return list.length ? list[list.length - 1].end : range.start;
}
