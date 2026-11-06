/**
 * Webcam bubble: where the camera picture sits on the canvas and which part of
 * the camera frame fills it. Pure functions so they can be unit tested.
 */
import type { Rect, Size } from "./layout";

export type BubbleShape = "circle" | "rounded";
export type Corner = "tl" | "tr" | "bl" | "br";

export interface Bubble {
  visible: boolean;
  shape: BubbleShape;
  /** Diameter (or side) as a fraction of the canvas's shorter side. */
  size: number;
  corner: Corner;
  /** Flip horizontally, like a mirror. */
  mirror: boolean;
}

export const DEFAULT_BUBBLE: Bubble = { visible: true, shape: "circle", size: 0.24, corner: "br", mirror: true };

export const BUBBLE_MIN = 0.12;
export const BUBBLE_MAX = 0.45;

/** Gap between the bubble and the canvas edge, as a fraction of the shorter side. */
export const BUBBLE_MARGIN = 0.04;

/** Square area on the canvas the bubble occupies. */
export function bubbleRect(canvas: Size, b: Pick<Bubble, "size" | "corner">): Rect {
  const short = Math.min(canvas.width, canvas.height);
  const side = Math.round(short * Math.min(BUBBLE_MAX, Math.max(BUBBLE_MIN, b.size)));
  const margin = Math.round(short * BUBBLE_MARGIN);
  const right = b.corner === "tr" || b.corner === "br";
  const bottom = b.corner === "bl" || b.corner === "br";
  return {
    x: right ? canvas.width - margin - side : margin,
    y: bottom ? canvas.height - margin - side : margin,
    width: side,
    height: side,
  };
}

/** Centred square crop of the camera frame (faces are usually in the middle). */
export function squareCrop(source: Size): Rect {
  const side = Math.min(source.width, source.height);
  return { x: (source.width - side) / 2, y: (source.height - side) / 2, width: side, height: side };
}

/** Corner radius for the bubble's shape. */
export function bubbleRadius(rect: Rect, shape: BubbleShape): number {
  return shape === "circle" ? rect.width / 2 : rect.width * 0.18;
}

/** The corner nearest to a point on the canvas (for click-to-move). */
export function nearestCorner(canvas: Size, x: number, y: number): Corner {
  const right = x > canvas.width / 2;
  const bottom = y > canvas.height / 2;
  return bottom ? (right ? "br" : "bl") : right ? "tr" : "tl";
}
