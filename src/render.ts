import { cameraAt, coverRect, fitFrame, sourceWindow, type Size, type ZoomSegment } from "./layout";

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
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource | null,
  sourceSize: Size,
  style: Style,
  zooms: readonly ZoomSegment[],
  time: number,
): void {
  const { width, height } = ctx.canvas;
  paintBackdrop(ctx, style.backdrop, width, height);

  const frame = fitFrame({ width, height }, sourceSize, style.padding);
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
    ctx.drawImage(source, win.x, win.y, win.width, win.height, frame.x, frame.y, frame.width, frame.height);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(frame.x, frame.y, frame.width, frame.height);
  }
  ctx.restore();
}

function paintBackdrop(ctx: CanvasRenderingContext2D, b: Backdrop, w: number, h: number): void {
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
