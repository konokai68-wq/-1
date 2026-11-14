/**
 * Runs the WebCodecs export off the main thread, so the page stays responsive
 * and the renderer doesn't compete with the UI for time. Draws on an
 * OffscreenCanvas with the same renderer as the preview.
 */
import { openCameraFrames, type CameraFrames } from "./cameraFrames";
import type { FromWorker, ToWorker } from "./exportProtocol";
import { exportFast, type FastExportJob } from "./fastExport";
import { drawFrame } from "./render";

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
  postMessage(msg: FromWorker): void;
};

let job: FastExportJob | null = null;
let cancelled = false;

scope.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    cancelled = true;
    job?.cancel();
    if (!job) scope.postMessage({ type: "done", blob: null });
    return;
  }
  let cam: CameraFrames | null = null;
  try {
    cam = msg.camera && msg.bubble.visible ? await openCameraFrames(msg.camera) : null;
    if (cancelled) {
      scope.postMessage({ type: "done", blob: null });
      return;
    }
    const { style, zooms, bubble, texts, masks } = msg;
    job = exportFast({
      source: msg.source,
      size: msg.size,
      plan: msg.plan,
      range: msg.range,
      cuts: msg.cuts,
      speeds: msg.speeds,
      frameRate: msg.frameRate,
      sound: msg.sound !== false,
      draw: async (ctx, frame, frameSize, time) => {
        const f = cam ? await cam.at(time) : null;
        drawFrame(ctx, frame, frameSize, style, zooms, time, f ? { ...f, bubble } : null, texts, masks);
      },
      onProgress: (fraction) => scope.postMessage({ type: "progress", fraction }),
    });
    scope.postMessage({ type: "done", blob: await job.done });
  } catch (err) {
    scope.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    cam?.dispose();
  }
};
