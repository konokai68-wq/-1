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
  AudioSample,
  type VideoCodec,
} from "mediabunny";
import { pieces, toOutputTime, type Span, type SpeedSpan } from "./cuts";
import type { Size } from "./layout";
import type { ExportJob } from "./media";
import type { Ctx2D } from "./render";

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

/**
 * Snap a frame's output time to the frame grid; null when an earlier frame
 * already fills that slot (sped-up parts deliver several source frames per
 * output frame).
 */
export function frameSlotter(frameRate: number) {
  let last = -1;
  return (outputTime: number): number | null => {
    const slot = Math.round(outputTime * frameRate + 1e-6);
    if (slot <= last) return null;
    last = slot;
    return slot / frameRate;
  };
}

/**
 * Drop audio inside cuts and close the gaps; sped-up parts become silence of
 * the squeezed length (no chipmunk voices). A sample is kept or dropped by its
 * start time; kept samples never overlap the previous one, so at worst an edit
 * edge is off by one sample's length (~20 ms).
 */
function retimeAudio(range: Span, cuts: readonly Span[], speeds: readonly SpeedSpan[]) {
  const list = pieces(range, cuts, speeds);
  let nextFree = 0;
  let owed = 0;
  return (sample: AudioSample): AudioSample | null => {
    const t = sourceTime(sample.timestamp, range.start);
    const out = toOutputTime(range, cuts, t, speeds);
    if (out === null) return null;
    const at = Math.max(out, nextFree);
    const rate = list.find((p) => t >= p.start && t < p.end)?.rate ?? 1;
    if (rate === 1) {
      sample.setTimestamp(at);
      nextFree = at + sample.duration;
      return sample;
    }
    owed += sample.numberOfFrames / rate;
    const frames = Math.floor(owed);
    owed -= frames;
    const { numberOfChannels, sampleRate } = sample;
    sample.close();
    if (frames === 0) return null;
    nextFree = at + frames / sampleRate;
    return new AudioSample({
      data: new Float32Array(frames * numberOfChannels),
      format: "f32-planar",
      numberOfChannels,
      sampleRate,
      timestamp: at,
    });
  };
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
  /** Parts of the source to leave out (source timeline). */
  cuts: readonly Span[];
  /** Parts of the source to play faster (source timeline). */
  speeds: readonly SpeedSpan[];
  frameRate: number;
  /** Draw one styled frame for `time` (seconds on the source timeline). */
  draw: (ctx: Ctx2D, frame: CanvasImageSource, frameSize: Size, time: number) => void | Promise<void>;
  onProgress: (fraction: number) => void;
}

export interface FastExportJob extends ExportJob {
  extension: "mp4" | "webm";
}

/** A drawing surface that works on the page and inside a worker. */
function makeCanvas(size: Size): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: Ctx2D } {
  if (typeof document === "undefined") {
    const canvas = new OffscreenCanvas(size.width, size.height);
    return { canvas, ctx: canvas.getContext("2d")! };
  }
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  return { canvas, ctx: canvas.getContext("2d")! };
}

export function exportFast(opts: FastExportOptions): FastExportJob {
  const { canvas, ctx } = makeCanvas(opts.size);
  let conversion: Conversion | null = null;
  let cancelled = false;

  const { cuts, speeds } = opts;
  const edited = cuts.length > 0 || speeds.length > 0;
  const slot = frameSlotter(opts.frameRate);

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
          const time = sourceTime(sample.timestamp, opts.range.start);
          if (edited) {
            const out = toOutputTime(opts.range, cuts, time, speeds);
            const at = out === null ? null : slot(out);
            if (at === null) return null;
            sample.setTimestamp(at);
          }
          const frame = sample.toCanvasImageSource();
          await opts.draw(ctx, frame, { width: sample.displayWidth, height: sample.displayHeight }, time);
          return canvas;
        },
      },
      audio: {
        codec: mp4 ? "aac" : "opus",
        ...(edited ? { forceTranscode: true, process: retimeAudio(opts.range, cuts, speeds) } : {}),
      },
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
