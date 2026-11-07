/** Pure planning helpers for GIF export, kept separate from the encoder so they can be tested. */
import { keptDuration, toSourceTime, type Span, type SpeedSpan } from "./cuts";
import { exportSize } from "./exportSettings";
import type { Size } from "./layout";

/** Frames per second for GIF output: smooth enough for UI demos, small enough to share. */
export const GIF_FPS = 15;
/** Shorter side of a GIF, in pixels (854 × 480 for 16:9). */
export const GIF_SHORT_SIDE = 480;
/** Longest clip we turn into a GIF; longer ones get huge and slow to encode. */
export const GIF_MAX_SECONDS = 30;

export function gifSize(base: Size): Size {
  return exportSize(base, GIF_SHORT_SIDE);
}

export interface GifPlan {
  /** Source-timeline sample time for each frame, in seconds. */
  times: number[];
  /** Display time for each frame, in milliseconds (multiples of 10, GIF's unit). */
  delays: number[];
}

/**
 * Sample `range` at `fps`. GIF delays are whole centiseconds, so 15 fps can't be
 * exact per frame; delays alternate (e.g. 70, 60, 70 ms) so the total length
 * matches the clip instead of drifting slower. Cut-away parts are skipped and
 * sped-up parts sampled more sparsely.
 */
export function planGif(range: Span, fps = GIF_FPS, cuts: readonly Span[] = [], speeds: readonly SpeedSpan[] = []): GifPlan {
  const duration = keptDuration(range, cuts, speeds);
  const mapped = cuts.length > 0 || speeds.length > 0;
  const count = Math.max(1, Math.ceil(duration * fps - 1e-6));
  const times: number[] = [];
  const delays: number[] = [];
  for (let i = 0; i < count; i++) {
    times.push(mapped ? toSourceTime(range, cuts, i / fps, speeds) : range.start + i / fps);
    const cs = Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps);
    delays.push(Math.max(2, cs) * 10);
  }
  return { times, delays };
}

export function gifTooLong(range: Span, cuts: readonly Span[] = [], speeds: readonly SpeedSpan[] = []): boolean {
  return keptDuration(range, cuts, speeds) > GIF_MAX_SECONDS + 1e-6;
}
