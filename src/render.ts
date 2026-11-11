import { bubbleRadius, bubbleRect, squareCrop, type Bubble } from "./camera";
import { cameraAt, coverRect, sourceWindow, windowLayout, type Rect, type Size, type WindowChrome, type ZoomSegment } from "./layout";
import { TEXT_LOOKS, arrowGeometry, layoutText, textIndexAt, textOpacity, type ArrowGeometry, type TextNote } from "./texts";

/** 2D context of an on-page canvas or of an OffscreenCanvas (export worker). */
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface GradientBackdrop {
  kind: "gradient";
  id: string;
  name: string;
  /** Two or more colour stops, drawn diagonally from top-left. */
  stops: string[];
}

export interface SolidBackdrop {
  kind: "solid";
  color: string;
}

export interface ImageBackdrop {
  kind: "image";
  image: CanvasImageSource;
  size: Size;
  /** Blur radius as a fraction of the canvas's shorter side (0 = sharp). */
  blur: number;
}

export type Backdrop = GradientBackdrop | SolidBackdrop | ImageBackdrop;

export const BACKDROPS: GradientBackdrop[] = [
  { kind: "gradient", id: "harbor", name: "Harbor", stops: ["#2443d6", "#6fc3ea"] },
  { kind: "gradient", id: "dusk", name: "Dusk", stops: ["#3d2470", "#c2577f", "#f39a6b"] },
  { kind: "gradient", id: "moss", name: "Moss", stops: ["#173f33", "#4f8a5b", "#cfe08a"] },
  { kind: "gradient", id: "sunbeam", name: "Sunbeam", stops: ["#f7c948", "#f0743e"] },
  { kind: "gradient", id: "graphite", name: "Graphite", stops: ["#252a33", "#5b6574"] },
  { kind: "gradient", id: "paper", name: "Paper", stops: ["#f3f2ec", "#d5d9cf"] },
];

export interface Aspect {
  id: string;
  label: string;
  size: Size;
}

export const ASPECTS: Aspect[] = [
  { id: "16:9", label: "Widescreen 16:9", size: { width: 1920, height: 1080 } },
  { id: "1:1", label: "Square 1:1", size: { width: 1080, height: 1080 } },
  { id: "9:16", label: "Vertical 9:16", size: { width: 1080, height: 1920 } },
  { id: "4:3", label: "Classic 4:3", size: { width: 1440, height: 1080 } },
];

export interface Style {
  backdrop: Backdrop;
  /** Fraction of the canvas's shorter side. */
  padding: number;
  /** Corner radius as a fraction of the frame's shorter side. */
  radius: number;
  /** Shadow strength 0–1. */
  shadow: number;
  /** Optional window title bar above the recording. */
  chrome: WindowChrome;
}

/** A webcam picture to draw as a bubble over the frame. */
export interface CameraLayer {
  image: CanvasImageSource;
  size: Size;
  bubble: Bubble;
}

export function drawFrame(
  ctx: Ctx2D,
  source: CanvasImageSource | null,
  sourceSize: Size,
  style: Style,
  zooms: readonly ZoomSegment[],
  time: number,
  camera: CameraLayer | null = null,
  texts: readonly TextNote[] = [],
): void {
  const { width, height } = ctx.canvas;
  paintBackdrop(ctx, style.backdrop, width, height);

  const { outer: frame, bar, content } = windowLayout({ width, height }, sourceSize, style.padding, style.chrome);
  const r = style.radius * Math.min(frame.width, frame.height);

  if (style.shadow > 0) {
    ctx.save();
    ctx.shadowColor = `rgba(8, 14, 30, ${0.25 + style.shadow * 0.4})`;
    ctx.shadowBlur = style.shadow * Math.min(width, height) * 0.06;
    ctx.shadowOffsetY = style.shadow * Math.min(width, height) * 0.02;
    ctx.fillStyle = "#000";
    roundRect(ctx, frame.x, frame.y, frame.width, frame.height, r);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundRect(ctx, frame.x, frame.y, frame.width, frame.height, r);
  ctx.clip();
  if (source && sourceSize.width > 0) {
    const win = sourceWindow(sourceSize, cameraAt(time, zooms));
    ctx.drawImage(source, win.x, win.y, win.width, win.height, content.x, content.y, content.width, content.height);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(content.x, content.y, content.width, content.height);
  }
  if (bar && style.chrome !== "none") drawTitleBar(ctx, bar, style.chrome);
  ctx.restore();

  if (camera?.bubble.visible && camera.size.width > 0) drawBubble(ctx, camera);
  drawTexts(ctx, texts, time);
}

const CHROME_COLORS = {
  light: { bar: "#eceef2", line: "rgba(20, 24, 32, 0.10)", dot: "#c3c8d1", field: "#ffffff" },
  dark: { bar: "#23262d", line: "rgba(0, 0, 0, 0.45)", dot: "#4c525d", field: "#33373f" },
} as const;

/** A plain window title bar: three neutral dots and an empty address field. */
function drawTitleBar(ctx: Ctx2D, bar: Rect, chrome: Exclude<WindowChrome, "none">): void {
  const c = CHROME_COLORS[chrome];
  const h = bar.height;
  ctx.fillStyle = c.bar;
  ctx.fillRect(bar.x, bar.y, bar.width, h);
  ctx.fillStyle = c.line;
  ctx.fillRect(bar.x, bar.y + h - Math.max(1, h * 0.03), bar.width, Math.max(1, h * 0.03));

  const dot = h * 0.13;
  const cy = bar.y + h / 2;
  ctx.fillStyle = c.dot;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(bar.x + h * 0.6 + i * dot * 3.2, cy, dot, 0, Math.PI * 2);
    ctx.fill();
  }

  const fieldW = Math.min(bar.width * 0.42, bar.width - h * 5);
  if (fieldW > h) {
    const fieldH = h * 0.56;
    ctx.fillStyle = c.field;
    roundRect(ctx, bar.x + (bar.width - fieldW) / 2, cy - fieldH / 2, fieldW, fieldH, fieldH * 0.3);
    ctx.fill();
  }
}

/** Font used for text callouts (the size is filled in per callout). */
export const textFont = (px: number) => `650 ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

/** Width measurer for layoutText, using the canvas's own font metrics. */
export function canvasMeasure(ctx: Ctx2D) {
  return (fontSize: number) => {
    ctx.font = textFont(fontSize);
    return (s: string) => ctx.measureText(s).width;
  };
}

/** Draw the text callout shown at `time`: an optional arrow, then a pill that fades and rises in. */
export function drawTexts(ctx: Ctx2D, texts: readonly TextNote[], time: number): void {
  const i = textIndexAt(texts, time);
  if (i < 0) return;
  const note = texts[i];
  const alpha = textOpacity(note, time);
  const hasText = Boolean(note.text.trim());
  if (alpha <= 0 || (!hasText && !note.arrow)) return;
  const { width, height } = ctx.canvas;
  ctx.save();
  const l = layoutText({ width, height }, note, canvasMeasure(ctx));
  const look = TEXT_LOOKS.find((k) => k.id === note.look) ?? TEXT_LOOKS[0];
  ctx.globalAlpha = alpha;
  const arrow = arrowGeometry({ width, height }, note, hasText ? l.box : null);
  if (arrow) drawArrow(ctx, arrow, look.arrow, look.ink);
  if (!hasText) {
    ctx.restore();
    return;
  }
  const rise = (1 - alpha) * l.fontSize * 0.35;
  const { x, y: y0, width: w, height: h } = l.box;
  const y = y0 + rise;
  ctx.shadowColor = "rgba(8, 14, 30, 0.35)";
  ctx.shadowBlur = l.fontSize * 0.5;
  ctx.shadowOffsetY = l.fontSize * 0.12;
  ctx.fillStyle = look.fill;
  roundRect(ctx, x, y, w, h, Math.min(h / 2, l.fontSize * 0.6));
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = look.ink;
  ctx.font = textFont(l.fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const top = y + (h - l.lines.length * l.lineHeight) / 2;
  l.lines.forEach((line, n) => ctx.fillText(line, x + w / 2, top + (n + 0.5) * l.lineHeight));
  ctx.restore();
}

/** A callout arrow: a thin outline in `outline`, then shaft and head in `color`. */
function drawArrow(ctx: Ctx2D, a: ArrowGeometry, color: string, outline: string): void {
  const rim = Math.max(1, a.width * 0.35);
  const path = (extra: number) => {
    ctx.lineWidth = a.width + extra;
    ctx.beginPath();
    ctx.moveTo(a.from.x, a.from.y);
    ctx.lineTo(a.neck.x, a.neck.y);
    ctx.stroke();
    ctx.lineWidth = extra || 0.01;
    ctx.beginPath();
    ctx.moveTo(a.head[0].x, a.head[0].y);
    ctx.lineTo(a.head[1].x, a.head[1].y);
    ctx.lineTo(a.head[2].x, a.head[2].y);
    ctx.closePath();
    if (extra) ctx.stroke();
    ctx.fill();
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(8, 14, 30, 0.35)";
  ctx.shadowBlur = a.width * 2.5;
  ctx.shadowOffsetY = a.width * 0.6;
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  path(rim * 2);
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  path(0);
  ctx.restore();
}

/** Draw the webcam bubble: soft shadow, cropped camera picture and a thin rim. */
export function drawBubble(ctx: Ctx2D, camera: CameraLayer): void {
  const { width, height } = ctx.canvas;
  const rect = bubbleRect({ width, height }, camera.bubble);
  const r = bubbleRadius(rect, camera.bubble.shape);
  const crop = squareCrop(camera.size);

  ctx.save();
  ctx.shadowColor = "rgba(8, 14, 30, 0.45)";
  ctx.shadowBlur = rect.width * 0.12;
  ctx.shadowOffsetY = rect.width * 0.03;
  ctx.fillStyle = "#000";
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, r);
  ctx.clip();
  if (camera.bubble.mirror) {
    ctx.translate(rect.x * 2 + rect.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(camera.image, crop.x, crop.y, crop.width, crop.height, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = Math.max(2, rect.width * 0.015);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, r);
  ctx.stroke();
  ctx.restore();
}

function paintBackdrop(ctx: Ctx2D, b: Backdrop, w: number, h: number): void {
  if (b.kind === "solid") {
    ctx.fillStyle = b.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (b.kind === "image") {
    const blur = b.blur * Math.min(w, h);
    // Overscan when blurring so soft edges don't fade to transparent.
    const r = coverRect({ width: w + blur * 4, height: h + blur * 4 }, b.size);
    ctx.save();
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(b.image, r.x - blur * 2, r.y - blur * 2, r.width, r.height);
    ctx.restore();
    return;
  }
  const g = ctx.createLinearGradient(0, 0, w, h);
  b.stops.forEach((c, i) => g.addColorStop(b.stops.length === 1 ? 0 : i / (b.stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
