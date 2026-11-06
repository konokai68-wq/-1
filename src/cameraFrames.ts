/**
 * Camera frames for export, requested in increasing time order. Decodes the
 * camera clip sequentially with WebCodecs (Mediabunny) when possible, or seeks
 * a hidden <video> otherwise. Loaded on demand with the exporters.
 */
import { BlobSource, CanvasSink, Input, MATROSKA, MP4, QTFF, WEBM, type WrappedCanvas } from "mediabunny";
import type { Size } from "./layout";

export interface CameraFrame {
  image: CanvasImageSource;
  size: Size;
}

export interface CameraFrames {
  /** Frame showing at `time` seconds (times must not go backwards). */
  at(time: number): Promise<CameraFrame | null>;
  dispose(): void;
}

export async function openCameraFrames(source: Blob): Promise<CameraFrames> {
  if (typeof VideoDecoder !== "undefined") {
    const input = new Input({ source: new BlobSource(source), formats: [MP4, QTFF, WEBM, MATROSKA] });
    try {
      const track = await input.getPrimaryVideoTrack();
      if (track && (await track.canDecode())) return sequentialFrames(input, new CanvasSink(track, { poolSize: 0 }));
    } catch (err) {
      console.warn("Camera clip can't be decoded with WebCodecs, seeking a <video> instead.", err);
    }
    input.dispose();
  }
  return seekingFrames(source);
}

function sequentialFrames(input: Input, sink: CanvasSink): CameraFrames {
  let iter: AsyncGenerator<WrappedCanvas, void, unknown> | null = null;
  let current: WrappedCanvas | null = null;
  let next: WrappedCanvas | null = null;
  let finished = false;

  const pull = async (): Promise<WrappedCanvas | null> => {
    if (finished || !iter) return null;
    const r = await iter.next();
    if (r.done) {
      finished = true;
      return null;
    }
    return r.value;
  };

  const wrap = (w: WrappedCanvas | null): CameraFrame | null =>
    w ? { image: w.canvas as CanvasImageSource, size: { width: w.canvas.width, height: w.canvas.height } } : null;

  return {
    async at(time) {
      if (!iter) {
        iter = sink.canvases(Math.max(0, time));
        current = await pull();
        next = await pull();
      }
      while (next && next.timestamp <= time) {
        current = next;
        next = await pull();
      }
      return wrap(current);
    },
    dispose() {
      void iter?.return();
      input.dispose();
    },
  };
}

async function seekingFrames(source: Blob): Promise<CameraFrames> {
  const url = URL.createObjectURL(source);
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((resolve, reject) => {
    v.addEventListener("loadeddata", () => resolve(), { once: true });
    v.addEventListener("error", () => reject(new Error("The camera clip can't be read.")), { once: true });
  });
  return {
    async at(time) {
      const t = Math.min(time, Number.isFinite(v.duration) ? v.duration : time);
      if (Math.abs(v.currentTime - t) > 0.001) {
        v.currentTime = t;
        await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
      }
      return { image: v, size: { width: v.videoWidth, height: v.videoHeight } };
    },
    dispose() {
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
    },
  };
}
