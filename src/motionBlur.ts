import { ZOOM_RAMP, cameraAt, sourceWindow, type Rect, type Size, type ZoomSegment } from "./layout";

/**
 * Motion blur for zooms: while the camera moves, a frame is the average of a
 * few views of the same picture taken over a short "shutter" just before it,
 * the way a real camera smears a fast pan. Pure geometry; the renderer draws
 * the windows on top of each other.
 */

/** How far back the shutter reaches, in seconds of source time (about 40 % of a 30 fps frame). */
export const BLUR_SHUTTER = 0.014;
/** Most views averaged into one frame. */
export const MAX_BLUR_SAMPLES = 12;
/** Below this movement (output pixels across the shutter) the frame stays sharp. */
const MIN_MOVE_PX = 1.5;
/** One extra view per this many output pixels of movement. */
const PX_PER_SAMPLE = 3;

/**
 * The source windows to average for the frame at `time`, oldest first, the
 * last one being the frame's own window. `outputWidth` is how wide the
 * recording is drawn on the canvas, which sets how big a movement looks.
 * Returns just the current window when the camera is still. `ramp` is the
 * zoom ease length (see `cameraAt`).
 */
export function blurWindows(video: Size, zooms: readonly ZoomSegment[], time: number, outputWidth: number, ramp: number = ZOOM_RAMP): Rect[] {
  const now = sourceWindow(video, cameraAt(time, zooms, ramp));
  if (!zooms.length || video.width <= 0 || outputWidth <= 0) return [now];
  const before = sourceWindow(video, cameraAt(time - BLUR_SHUTTER, zooms, ramp));
  const move = windowMovePx(before, now, outputWidth);
  if (move < MIN_MOVE_PX) return [now];
  const n = Math.min(MAX_BLUR_SAMPLES, 1 + Math.ceil(move / PX_PER_SAMPLE));
  const out: Rect[] = [];
  for (let k = 0; k < n - 1; k++) {
    out.push(sourceWindow(video, cameraAt(time - BLUR_SHUTTER * (1 - k / (n - 1)), zooms, ramp)));
  }
  out.push(now);
  return out;
}

/** Largest distance any corner of the picture travels between two windows, in output pixels. */
export function windowMovePx(a: Rect, b: Rect, outputWidth: number): number {
  const px = outputWidth / b.width;
  return Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.x + a.width - (b.x + b.width)),
    Math.abs(a.y + a.height - (b.y + b.height)),
  ) * px;
}
