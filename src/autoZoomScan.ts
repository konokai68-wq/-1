/**
 * Auto zoom scan: sample the clip as small greyscale frames, measure what
 * changed between neighbours and hand the result to suggestZooms. Loaded on
 * demand (it pulls in the decoder).
 */
import { measureChange, scanSize, scanTimes, suggestZooms, toLuma, type ChangeSample } from "./autoZoom";
import type { Span } from "./cuts";
import { sourceFrames } from "./frameSource";
import type { ZoomSegment } from "./layout";

export interface AutoZoomJob {
  done: Promise<ZoomSegment[] | null>;
  cancel(): void;
}

class Cancelled extends Error {}

export function scanForZooms(opts: {
  source: Blob;
  range: { start: number; end: number };
  cuts: readonly Span[];
  existing: readonly ZoomSegment[];
  onProgress: (fraction: number) => void;
}): AutoZoomJob {
  let cancelled = false;
  const check = () => {
    if (cancelled) throw new Cancelled();
  };

  const run = async (): Promise<ZoomSegment[] | null> => {
    const times = scanTimes(opts.range, opts.cuts);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const samples: ChangeSample[] = [];
    let prev: Uint8Array | null = null;
    let prevTime = -Infinity;
    let i = 0;
    try {
      for await (const frame of sourceFrames(opts.source, times, check)) {
        const t = times[i++];
        if (frame) {
          const size = scanSize(frame.size);
          if (canvas.width !== size.width || canvas.height !== size.height) {
            canvas.width = size.width;
            canvas.height = size.height;
            prev = null;
          }
          ctx.drawImage(frame.image, 0, 0, size.width, size.height);
          const luma = toLuma(ctx.getImageData(0, 0, size.width, size.height).data);
          // Don't compare across a cut: the jump isn't a change on screen.
          const joined = !opts.cuts.some((c) => c.start >= prevTime && c.start < t);
          if (prev && joined) samples.push({ t, ...measureChange(prev, luma, size.width, size.height) });
          prev = luma;
          prevTime = t;
        }
        opts.onProgress(i / times.length);
        if (i % 8 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } catch (err) {
      if (err instanceof Cancelled) return null;
      throw err;
    }
    return suggestZooms(samples, { range: opts.range, existing: opts.existing });
  };

  return {
    done: run(),
    cancel: () => {
      cancelled = true;
    },
  };
}
