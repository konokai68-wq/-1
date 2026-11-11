/**
 * Messages between the page and the export worker (`exportWorker.ts`).
 * Everything here must survive structured cloning: Blobs and ImageBitmaps are
 * fine, functions and DOM elements are not.
 */
import type { Bubble } from "./camera";
import type { Span, SpeedSpan } from "./cuts";
import type { OutputPlan } from "./fastExport";
import type { Size, ZoomSegment } from "./layout";
import type { Style } from "./render";
import type { TextNote } from "./texts";

export interface ExportRequest {
  type: "start";
  source: Blob;
  /** Camera clip to draw as a bubble, or null. */
  camera: Blob | null;
  size: Size;
  plan: OutputPlan;
  range: Span;
  cuts: Span[];
  speeds: SpeedSpan[];
  frameRate: number;
  /** An image backdrop carries an ImageBitmap. */
  style: Style;
  zooms: ZoomSegment[];
  bubble: Bubble;
  texts: TextNote[];
}

export type ToWorker = ExportRequest | { type: "cancel" };

export type FromWorker =
  | { type: "progress"; fraction: number }
  | { type: "done"; blob: Blob | null }
  | { type: "error"; message: string };
