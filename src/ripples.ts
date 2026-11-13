import { ZOOM_RAMP, clamp, type ZoomSegment } from "./layout";

/**
 * Click ripples: a ring that grows and fades at a zoom's aim point once the
 * camera has arrived, so viewers see where the "click" happened. Pure timing
 * and shape; the renderer draws it.
 */

/** How long one ripple lasts, in seconds. */
export const RIPPLE_LENGTH = 0.7;
/** Largest ring radius, as a fraction of the recording's shorter side on the canvas. */
export const RIPPLE_RADIUS = 0.045;

export interface Ripple {
  /** Aim point in fractions of the (cropped) view. */
  x: number;
  y: number;
  /** 0 when the ripple starts, 1 when it is gone. */
  progress: number;
}

/** When the ripple of zoom `z` starts: as soon as the zoom has eased in. */
export function rippleStart(z: ZoomSegment): number {
  return z.start + Math.min(ZOOM_RAMP, (z.end - z.start) / 2);
}

/** The ripple showing at `time`, or null. A ripple never outlives its zoom. */
export function rippleAt(zooms: readonly ZoomSegment[], time: number): Ripple | null {
  for (const z of zooms) {
    const t0 = rippleStart(z);
    const t1 = Math.min(t0 + RIPPLE_LENGTH, z.end);
    if (time < t0 || time >= t1) continue;
    return { x: z.focusX, y: z.focusY, progress: (time - t0) / RIPPLE_LENGTH };
  }
  return null;
}

/** Ring size (fraction of the largest radius) and opacity at `progress`. */
export function rippleShape(progress: number): { size: number; alpha: number } {
  const p = clamp(progress, 0, 1);
  const size = 0.25 + 0.75 * (1 - Math.pow(1 - p, 3));
  const alpha = 1 - p * p;
  return { size, alpha };
}
