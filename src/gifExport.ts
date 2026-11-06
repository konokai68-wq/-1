/**
 * GIF export for short clips. Frames are pulled from the source (WebCodecs via
 * Mediabunny when available, otherwise by seeking a hidden <video>), drawn
 * through the styled renderer, quantised to a 256-colour palette per frame and
 * written with gifenc. Loaded on demand.
 */
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { BlobSource, CanvasSink, Input, MATROSKA, MP4, QTFF, WEBM } from "mediabunny";
import { planGif } from "./gif";
import type { Size } from "./layout";
import type { ExportJob } from "./media";

export interface GifExportOptions {
  source: Blob;
  size: Size;
  range: { start: number; end: number };
  draw: (ctx: CanvasRenderingContext2D, frame: CanvasImageSource, frameSize: Size, time: number) => void;
  onProgress: (fraction: number) => void;
}

type Frame = { image: CanvasImageSource; size: Size };

class Cancelled extends Error {}

export function exportGif(opts: GifExportOptions): ExportJob {
  let cancelled = false;
  const check = () => {
    if (cancelled) throw new Cancelled();
  };

  const run = async (): Promise<Blob | null> => {
    const { times, delays } = planGif(opts.range);
    const canvas = document.createElement("canvas");
    canvas.width = opts.size.width;
    canvas.height = opts.size.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const gif = GIFEncoder();
    let i = 0;
    try {
      for await (const frame of sourceFrames(opts.source, times, check)) {
        check();
        if (frame) opts.draw(ctx, frame.image, frame.size, times[i]);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, width, height, { palette, delay: delays[i] });
        i++;
        opts.onProgress(i / times.length);
        // Let the page repaint (progress, cancel button) between frames.
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (err) {
      if (err instanceof Cancelled) return null;
      throw err;
    }
    gif.finish();
    return new Blob([gif.bytesView()], { type: "image/gif" });
  };

  return {
    done: run(),
    cancel: () => {
      cancelled = true;
    },
  };
}

async function* sourceFrames(source: Blob, times: number[], check: () => void): AsyncGenerator<Frame | null> {
  if (typeof VideoDecoder !== "undefined") {
    const input = new Input({ source: new BlobSource(source), formats: [MP4, QTFF, WEBM, MATROSKA] });
    let yielded = 0;
    try {
      const track = await input.getPrimaryVideoTrack();
      if (track && (await track.canDecode())) {
        const sink = new CanvasSink(track, { poolSize: 2 });
        for await (const wrapped of sink.canvasesAtTimestamps(times)) {
          check();
          yielded++;
          yield wrapped ? { image: wrapped.canvas as CanvasImageSource, size: { width: wrapped.canvas.width, height: wrapped.canvas.height } } : null;
        }
        return;
      }
    } catch (err) {
      // Decoding failed before any frame was produced: fall back to seeking.
      if (err instanceof Cancelled || yielded > 0) throw err;
      console.warn("WebCodecs decoding failed, seeking a <video> instead.", err);
    } finally {
      input.dispose();
    }
  }
  yield* seekFrames(source, times, check);
}

async function* seekFrames(source: Blob, times: number[], check: () => void): AsyncGenerator<Frame> {
  const url = URL.createObjectURL(source);
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  try {
    await once(v, "loadeddata");
    const size = { width: v.videoWidth, height: v.videoHeight };
    for (const t of times) {
      check();
      v.currentTime = t;
      await once(v, "seeked");
      yield { image: v, size };
    }
  } finally {
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}

function once(el: HTMLMediaElement, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => {
      el.removeEventListener("error", bad);
      resolve();
    };
    const bad = () => {
      el.removeEventListener(type, ok);
      reject(new Error("This video can't be read for GIF export."));
    };
    el.addEventListener(type, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}
