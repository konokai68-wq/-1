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

/** Optional window title bar drawn above the recording. */
export type WindowChrome = "none" | "light" | "dark";
export const WINDOW_CHROMES: readonly WindowChrome[] = ["none", "light", "dark"];

/** Title bar height as a fraction of the video's longer side (in source pixels). */
export const WINDOW_BAR = 0.034;

export interface WindowLayout {
  /** The whole framed window: title bar plus recording. */
  outer: Rect;
  /** The title bar, or null when there is no window chrome. */
  bar: Rect | null;
  /** Where the recording itself is drawn. */
  content: Rect;
}

/**
 * Like fitFrame, but leaves room for a title bar above the recording when
 * `chrome` is not "none". The bar and the recording share one outline, so the
 * recording keeps its aspect ratio and the bar keeps its height when zooming.
 */
export function windowLayout(canvas: Size, video: Size, padding: number, chrome: WindowChrome): WindowLayout {
  if (chrome === "none" || video.width <= 0 || video.height <= 0) {
    const outer = fitFrame(canvas, video, padding);
    return { outer, bar: null, content: outer };
  }
  const barSrc = Math.max(video.width, video.height) * WINDOW_BAR;
  const outer = fitFrame(canvas, { width: video.width, height: video.height + barSrc }, padding);
  const barH = (outer.height * barSrc) / (video.height + barSrc);
  return {
    outer,
    bar: { x: outer.x, y: outer.y, width: outer.width, height: barH },
    content: { x: outer.x, y: outer.y + barH, width: outer.width, height: outer.height - barH },
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

/** Seconds spent easing into and out of each zoom (the *Normal* zoom speed). */
export const ZOOM_RAMP = 0.6;

/** How quickly zooms ease in and out. */
export type ZoomSpeed = "slow" | "normal" | "fast";
export const ZOOM_SPEEDS: readonly ZoomSpeed[] = ["slow", "normal", "fast"];
/** Ease-in / ease-out length in seconds for each zoom speed. */
export const ZOOM_RAMPS: Readonly<Record<ZoomSpeed, number>> = { slow: 1, normal: ZOOM_RAMP, fast: 0.35 };

/** The ease length for `speed`; anything unknown is treated as *Normal*. */
export function rampFor(speed: ZoomSpeed | undefined): number {
  return speed && Object.prototype.hasOwnProperty.call(ZOOM_RAMPS, speed) ? ZOOM_RAMPS[speed] : ZOOM_RAMP;
}

/**
 * Back-to-back zooms closer than this (seconds between one's end and the
 * next one's start) are linked: the camera glides from one to the other
 * instead of zooming out to the full view and back in.
 */
export const ZOOM_LINK_GAP = 1;

/** The ease length actually used by zoom `s`: at most half the zoom, so short zooms still reach their target. */
export function rampOf(s: ZoomSegment, ramp: number = ZOOM_RAMP): number {
  return Math.min(Math.max(0, ramp), Math.max(0, s.end - s.start) / 2);
}

function targetOf(s: ZoomSegment): Camera {
  return { scale: s.scale, focusX: s.focusX, focusY: s.focusY };
}

function mixCamera(a: Camera, b: Camera, k: number): Camera {
  return {
    scale: a.scale + (b.scale - a.scale) * k,
    focusX: a.focusX + (b.focusX - a.focusX) * k,
    focusY: a.focusY + (b.focusY - a.focusY) * k,
  };
}

/** Whether zoom `b` (starting after `a`) is close enough to `a` to glide straight to it. */
export function zoomsLinked(a: ZoomSegment, b: ZoomSegment): boolean {
  const gap = b.start - a.end;
  return gap >= 0 && gap <= ZOOM_LINK_GAP;
}

/**
 * Camera state at time `t`. Zooms ease in over the first `ramp` seconds
 * (ZOOM_RAMP by default, see ZOOM_RAMPS) of a segment and ease out over the
 * last, so cuts never jump. Linked zooms
 * (see ZOOM_LINK_GAP) glide straight from one aim point to the next, from the
 * start of the first one's ease-out to the end of the second one's ease-in.
 */
export function cameraAt(t: number, segments: readonly ZoomSegment[], rampLength: number = ZOOM_RAMP): Camera {
  let list = segments;
  for (let i = 1; i < list.length; i++) {
    if (list[i].start < list[i - 1].start) {
      list = [...segments].sort((a, b) => a.start - b.start);
      break;
    }
  }
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const prev = i > 0 && zoomsLinked(list[i - 1], s) ? list[i - 1] : null;
    const next = i < list.length - 1 && zoomsLinked(s, list[i + 1]) ? list[i + 1] : null;
    const ramp = rampOf(s, rampLength);
    if (t >= s.start && t <= s.end) {
      if (ramp > 0 && t < s.start + ramp) {
        if (prev) return glide(prev, s, t, rampLength);
        return mixCamera(IDLE_CAMERA, targetOf(s), easeInOut((t - s.start) / ramp));
      }
      if (ramp > 0 && t > s.end - ramp) {
        if (next) return glide(s, next, t, rampLength);
        return mixCamera(IDLE_CAMERA, targetOf(s), easeInOut((s.end - t) / ramp));
      }
      return targetOf(s);
    }
    if (next && t > s.end && t < next.start) return glide(s, next, t, rampLength);
  }
  return IDLE_CAMERA;
}

/** The camera between linked zooms `a` and `b`. */
function glide(a: ZoomSegment, b: ZoomSegment, t: number, ramp: number): Camera {
  const from = a.end - rampOf(a, ramp);
  const to = b.start + rampOf(b, ramp);
  const k = to > from ? easeInOut((t - from) / (to - from)) : t >= to ? 1 : 0;
  return mixCamera(targetOf(a), targetOf(b), k);
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

/**
 * Scale and center `image` so it covers the whole `canvas` (like CSS
 * `object-fit: cover`). Parts of the image may fall outside the canvas.
 */
export function coverRect(canvas: Size, image: Size): Rect {
  if (image.width <= 0 || image.height <= 0) return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: (canvas.width - width) / 2, y: (canvas.height - height) / 2, width, height };
}

export function easeInOut(x: number): number {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
