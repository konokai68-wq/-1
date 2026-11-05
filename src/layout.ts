/** Pure geometry helpers for placing a recording on a styled canvas. */

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fit a video of `video` size inside `canvas`, leaving `padding` (0–0.45, a
 * fraction of the canvas's shorter side) on every edge. The result keeps the
 * video's aspect ratio and is centered.
 */
export function fitFrame(canvas: Size, video: Size, padding: number): Rect {
  const p = clamp(padding, 0, 0.45) * Math.min(canvas.width, canvas.height);
  const boxW = Math.max(1, canvas.width - p * 2);
  const boxH = Math.max(1, canvas.height - p * 2);
  if (video.width <= 0 || video.height <= 0) {
    return { x: p, y: p, width: boxW, height: boxH };
  }
  const scale = Math.min(boxW / video.width, boxH / video.height);
  const width = video.width * scale;
  const height = video.height * scale;
  return {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
  };
}

/** A span of time during which the camera zooms toward a point. */
export interface ZoomSegment {
  start: number; // seconds
  end: number; // seconds
  scale: number; // 1 = no zoom
  /** Focus point in the video, 0–1 on each axis. */
  focusX: number;
  focusY: number;
}

export interface Camera {
  scale: number;
  focusX: number;
  focusY: number;
}

export const IDLE_CAMERA: Camera = { scale: 1, focusX: 0.5, focusY: 0.5 };

/** Seconds spent easing into and out of each zoom. */
export const ZOOM_RAMP = 0.6;

/**
 * Camera state at time `t`. Zooms ease in over the first ZOOM_RAMP seconds of
 * a segment and ease out over the last, so cuts never jump.
 */
export function cameraAt(t: number, segments: readonly ZoomSegment[]): Camera {
  for (const s of segments) {
    if (t < s.start || t > s.end) continue;
    const ramp = Math.min(ZOOM_RAMP, (s.end - s.start) / 2);
    const k =
      ramp <= 0
        ? 1
        : easeInOut(Math.min(1, (t - s.start) / ramp, (s.end - t) / ramp));
    return {
      scale: 1 + (s.scale - 1) * k,
      focusX: 0.5 + (s.focusX - 0.5) * k,
      focusY: 0.5 + (s.focusY - 0.5) * k,
    };
  }
  return IDLE_CAMERA;
}

/**
 * The part of the source video (in source pixels) visible through a camera.
 * The window is kept inside the video so zooming never shows empty space.
 */
export function sourceWindow(video: Size, cam: Camera): Rect {
  const scale = Math.max(1, cam.scale);
  const width = video.width / scale;
  const height = video.height / scale;
  const x = clamp(cam.focusX * video.width - width / 2, 0, video.width - width);
  const y = clamp(cam.focusY * video.height - height / 2, 0, video.height - height);
  return { x, y, width, height };
}

export function easeInOut(x: number): number {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
