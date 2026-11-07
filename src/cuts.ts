/**
 * Cuts: parts of the source clip left out of the result. Times are on the
 * source timeline; the "output" timeline is what remains of the trimmed range
 * once the cuts are removed, starting at zero.
 */
export interface Span {
  start: number;
  end: number;
}

export const DEFAULT_CUT_LENGTH = 1;
export const MIN_CUT_LENGTH = 0.2;

/**
 * Add a cut starting at `t`. It runs for DEFAULT_CUT_LENGTH seconds, or less if
 * it would reach the next cut or the end of the video. Returns the same list
 * (sorted) when there is no room.
 */
export function addCut(cuts: readonly Span[], t: number, duration: number): Span[] {
  const list = [...cuts].sort((a, b) => a.start - b.start);
  if (list.some((c) => t >= c.start && t < c.end)) return list;
  const next = list.find((c) => c.start > t);
  const end = Math.min(t + DEFAULT_CUT_LENGTH, next ? next.start : Infinity, duration);
  if (end - t < MIN_CUT_LENGTH) return list;
  list.push({ start: t, end });
  return list.sort((a, b) => a.start - b.start);
}

/** Index of the cut covering source time `t` (start inclusive, end exclusive), or -1. */
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

/** Length of the result, in seconds. */
export function keptDuration(range: Span, cuts: readonly Span[]): number {
  return keptSpans(range, cuts).reduce((sum, s) => sum + (s.end - s.start), 0);
}

/** Map a source time to the output timeline, or null when it is trimmed or cut away. */
export function toOutputTime(range: Span, cuts: readonly Span[], t: number): number | null {
  let o = 0;
  for (const s of keptSpans(range, cuts)) {
    if (t < s.start) return null;
    if (t < s.end) return o + (t - s.start);
    o += s.end - s.start;
  }
  return null;
}

/** Map an output time back to the source timeline (clamped to the result). */
export function toSourceTime(range: Span, cuts: readonly Span[], o: number): number {
  const spans = keptSpans(range, cuts);
  for (const s of spans) {
    const len = s.end - s.start;
    if (o < len) return s.start + Math.max(0, o);
    o -= len;
  }
  return spans.length ? spans[spans.length - 1].end : range.start;
}
