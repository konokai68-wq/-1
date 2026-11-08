/**
 * GIF export for short clips. Frames are pulled from the source (WebCodecs via
 * Mediabunny when available, otherwise by seeking a hidden <video>), drawn
 * through the styled renderer, quantised to a 256-colour palette per frame and
 * written with gifenc. Loaded on demand.
 */
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { sourceFrames } from "./frameSource";
import { planGif } from "./gif";
import type { Span, SpeedSpan } from "./cuts";
import type { Size } from "./layout";
import type { ExportJob } from "./media";

export interface GifExportOptions {
  source: Blob;
  size: Size;
  range: { start: number; end: number };
  cuts: readonly Span[];
  speeds: readonly SpeedSpan[];
  draw: (ctx: CanvasRenderingContext2D, frame: CanvasImageSource, frameSize: Size, time: number) => void | Promise<void>;
  onProgress: (fraction: number) => void;
}

class Cancelled extends Error {}

export function exportGif(opts: GifExportOptions): ExportJob {
  let cancelled = false;
  const check = () => {
    if (cancelled) throw new Cancelled();
  };

  const run = async (): Promise<Blob | null> => {
    const { times, delays } = planGif(opts.range, undefined, opts.cuts, opts.speeds);
    const canvas = document.createElement("canvas");
    canvas.width = opts.size.width;
    canvas.height = opts.size.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const gif = GIFEncoder();
    let i = 0;
    try {
      for await (const frame of sourceFrames(opts.source, times, check)) {
        check();
        if (frame) await opts.draw(ctx, frame.image, frame.size, times[i]);
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
