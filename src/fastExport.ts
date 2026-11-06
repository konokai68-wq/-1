/**
 * Faster-than-real-time export: decode the source with WebCodecs, redraw every
 * frame through the styled renderer and re-encode it (MP4/H.264 when the
 * browser can, otherwise WebM/VP9). Built on Mediabunny's Conversion API.
 */
import {
  BlobSource,
  BufferTarget,
  Conversion,
  ConversionCanceledError,
  Input,
  MATROSKA,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  QUALITY_HIGH,
  WEBM,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type VideoCodec,
} from "mediabunny";
import type { Size } from "./layout";
import type { ExportJob } from "./media";

export interface OutputPlan {
  container: "mp4" | "webm";
  codec: VideoCodec;
}

export interface Encodable {
  video: readonly VideoCodec[];
  audio: readonly AudioCodec[];
}

/**
 * Prefer the most widely playable result the browser can actually encode,
 * without silently dropping the soundtrack: MP4 needs AAC, WebM needs Opus.
 */
export function planOutput(enc: Encodable, hasAudio: boolean): OutputPlan | null {
  if (enc.video.includes("avc") && (!hasAudio || enc.audio.includes("aac"))) return { container: "mp4", codec: "avc" };
  if (hasAudio && !enc.audio.includes("opus")) return null;
  for (const codec of ["vp9", "vp8", "av1"] as const) {
    if (enc.video.includes(codec)) return { container: "webm", codec };
  }
  return null;
}

/** Output timestamps start at zero; zooms are keyed to the source timeline. */
export function sourceTime(outputTimestamp: number, trimStart: number): number {
  return outputTimestamp + trimStart;
}

function openInput(source: Blob): Input {
  return new Input({ source: new BlobSource(source), formats: [MP4, QTFF, WEBM, MATROSKA] });
}

/** Work out what this browser can export for `source`, or null if WebCodecs can't do it. */
export async function detectFastExport(source: Blob, size: Size): Promise<OutputPlan | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") return null;
  const input = openInput(source);
  try {
    const hasAudio = (await input.getPrimaryAudioTrack()) !== null;
    const video: VideoCodec[] = [];
    for (const codec of ["avc", "vp9", "vp8", "av1"] as const) {
      if (await canEncodeVideo(codec, { width: size.width, height: size.height }).catch(() => false)) video.push(codec);
    }
    const audio: AudioCodec[] = [];
    if (hasAudio) {
      for (const codec of ["aac", "opus"] as const) if (await canEncodeAudio(codec).catch(() => false)) audio.push(codec);
    }
    return planOutput({ video, audio }, hasAudio);
  } catch {
    return null;
  } finally {
    input.dispose();
  }
}

export interface FastExportOptions {
  source: Blob;
  size: Size;
  plan: OutputPlan;
  range: { start: number; end: number };
  frameRate: number;
  /** Draw one styled frame for `time` (seconds on the source timeline). */
  draw: (ctx: CanvasRenderingContext2D, frame: CanvasImageSource, frameSize: Size, time: number) => void | Promise<void>;
  onProgress: (fraction: number) => void;
}

export interface FastExportJob extends ExportJob {
  extension: "mp4" | "webm";
}

export function exportFast(opts: FastExportOptions): FastExportJob {
  const canvas = document.createElement("canvas");
  canvas.width = opts.size.width;
  canvas.height = opts.size.height;
  const ctx = canvas.getContext("2d")!;
  let conversion: Conversion | null = null;
  let cancelled = false;

  const run = async (): Promise<Blob | null> => {
    const input = openInput(opts.source);
    const target = new BufferTarget();
    const mp4 = opts.plan.container === "mp4";
    const output = new Output({
      format: mp4 ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
      target,
    });
    conversion = await Conversion.init({
      input,
      output,
      trim: { start: opts.range.start, end: opts.range.end },
      showWarnings: false,
      video: {
        codec: opts.plan.codec,
        quality: QUALITY_HIGH,
        frameRate: opts.frameRate,
        forceTranscode: true,
        processedWidth: opts.size.width,
        processedHeight: opts.size.height,
        process: async (sample) => {
          const frame = sample.toCanvasImageSource();
          await opts.draw(ctx, frame, { width: sample.displayWidth, height: sample.displayHeight }, sourceTime(sample.timestamp, opts.range.start));
          return canvas;
        },
      },
      audio: { codec: mp4 ? "aac" : "opus" },
    });
    if (!conversion.isValid) throw new Error("This video can't be converted in this browser.");
    conversion.onProgress = (p) => opts.onProgress(p);
    if (cancelled) return null;
    try {
      await conversion.execute();
    } catch (err) {
      if (err instanceof ConversionCanceledError) return null;
      throw err;
    }
    input.dispose();
    const buffer = target.buffer;
    return buffer ? new Blob([buffer], { type: mp4 ? "video/mp4" : "video/webm" }) : null;
  };

  return {
    extension: opts.plan.container,
    done: run(),
    cancel: () => {
      cancelled = true;
      void conversion?.cancel();
    },
  };
}
