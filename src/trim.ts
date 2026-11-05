export interface Trim {
  start: number;
  end: number;
}

export type Edge = "start" | "end";

/** Shortest clip the trim may leave, in seconds. */
export const MIN_TRIM_LENGTH = 0.5;

export function fullTrim(duration: number): Trim {
  return { start: 0, end: Math.max(0, duration) };
}

/**
 * Move one edge of the trim to `t`, keeping at least MIN_TRIM_LENGTH seconds
 * and staying inside 0…duration.
 */
export function setTrimEdge(trim: Trim, edge: Edge, t: number, duration: number): Trim {
  const min = Math.min(MIN_TRIM_LENGTH, duration);
  if (edge === "start") return { start: clamp(t, 0, Math.max(0, trim.end - min)), end: trim.end };
  return { start: trim.start, end: clamp(t, Math.min(duration, trim.start + min), duration) };
}

/** True when the trim keeps the whole clip. */
export function isFullTrim(trim: Trim, duration: number): boolean {
  return trim.start <= 0.001 && trim.end >= duration - 0.001;
}

/** Where playback should start: inside the trim, rewinding if at or past its end. */
export function playStart(trim: Trim, t: number): number {
  return t < trim.start || t >= trim.end - 0.05 ? trim.start : t;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
