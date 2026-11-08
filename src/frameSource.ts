/**
 * Pull frames of a video at given source times: WebCodecs via Mediabunny when
 * the browser can decode the track, otherwise by seeking a hidden <video>.
 * Used by GIF export and the auto zoom scan.
 */
import { BlobSource, CanvasSink, Input, MATROSKA, MP4, QTFF, WEBM } from "mediabunny";
import type { Size } from "./layout";

export type Frame = { image: CanvasImageSource; size: Size };

/**
 * Yields one frame (or null when a time can't be decoded) per entry of `times`,
 * which must be ascending. `check` runs before each frame; throw from it to stop.
 */
export async function* sourceFrames(source: Blob, times: number[], guard: () => void): AsyncGenerator<Frame | null> {
  let stopped = false;
  const check = () => {
    try {
      guard();
    } catch (err) {
      stopped = true;
      throw err;
    }
  };
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
      if (stopped || yielded > 0) throw err;
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
      reject(new Error("This video can't be read."));
    };
    el.addEventListener(type, ok, { once: true });
    el.addEventListener("error", bad, { once: true });
  });
}
