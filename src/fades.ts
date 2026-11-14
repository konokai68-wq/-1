/**
 * Fade in / fade out: the finished video starts from black and ends on black.
 * Worked out on the output timeline, so cuts and sped-up parts are respected.
 */
import { keptDuration, toOutputTime, type Span, type SpeedSpan } from "./cuts";
import type { Ctx2D } from "./render";

export type FadeLength = "off" | "short" | "long";
export const FADE_LENGTHS: readonly FadeLength[] = ["off", "short", "long"];
/** Seconds of each fade. */
export const FADE_SECONDS: Readonly<Record<FadeLength, number>> = { off: 0, short: 0.5, long: 1 };

/**
 * How much of the picture shows at source time `t` (1 = all of it, 0 = black).
 * Fades never take more than half of a short clip, so a clip is never all black.
 */
export function fadeAlpha(
  length: FadeLength | undefined,
  range: Span,
  cuts: readonly Span[],
  speeds: readonly SpeedSpan[],
  t: number,
): number {
  const secs = FADE_SECONDS[length ?? "off"] ?? 0;
  if (!(secs > 0)) return 1;
  const out = toOutputTime(range, cuts, t, speeds);
  if (out === null) return 1;
  const total = keptDuration(range, cuts, speeds);
  const len = Math.min(secs, total / 2);
  if (!(len > 0)) return 1;
  const a = Math.min(out / len, (total - out) / len, 1);
  return a <= 0 ? 0 : smooth(a);
}

/** Ease so the fade starts and ends gently. */
function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

/** Darken the whole canvas towards black; alpha 1 leaves it untouched. */
export function drawFade(ctx: Ctx2D, alpha: number): void {
  if (alpha >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, alpha);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
