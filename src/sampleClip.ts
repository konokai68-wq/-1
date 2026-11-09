/**
 * Turn the drawn sample scene (sample.ts) into a real video file the editor can
 * open. With WebCodecs it is encoded frame by frame (well under a second);
 * otherwise the canvas is recorded in real time with MediaRecorder.
 * Loaded on demand, like the exporters.
 */
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, WebMOutputFormat, canEncodeVideo } from "mediabunny";
import { SAMPLE_FPS, SAMPLE_HEIGHT, SAMPLE_SECONDS, SAMPLE_WIDTH, drawSample } from "./sample";

export async function makeSampleClip(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d canvas");
  if (typeof VideoEncoder !== "undefined") {
    const fast = await encodeFast(canvas, g).catch(() => null);
    if (fast) return fast;
  }
  return recordRealTime(canvas, g);
}

async function encodeFast(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D): Promise<Blob | null> {
  const size = { width: SAMPLE_WIDTH, height: SAMPLE_HEIGHT };
  let plan: { mp4: boolean; codec: "avc" | "vp9" | "vp8" } | null = null;
  // Encoding a codec is not the same as playing it back (Chromium builds without
  // H.264, for one), so only pick what this browser's <video> can also play.
  const probe = document.createElement("video");
  const playable = {
    avc: probe.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "",
    vp9: probe.canPlayType('video/webm; codecs="vp9"') !== "",
    vp8: probe.canPlayType('video/webm; codecs="vp8"') !== "",
  };
  for (const [mp4, codec] of [[true, "avc"], [false, "vp9"], [false, "vp8"]] as const) {
    if (playable[codec] && (await canEncodeVideo(codec, size).catch(() => false))) {
      plan = { mp4, codec };
      break;
    }
  }
  if (!plan) return null;
  const target = new BufferTarget();
  const output = new Output({
    format: plan.mp4 ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
    target,
  });
  const source = new CanvasSource(canvas, { codec: plan.codec, quality: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: SAMPLE_FPS });
  await output.start();
  const frames = SAMPLE_SECONDS * SAMPLE_FPS;
  for (let i = 0; i < frames; i++) {
    drawSample(g, i / SAMPLE_FPS);
    await source.add(i / SAMPLE_FPS, 1 / SAMPLE_FPS);
  }
  await output.finalize();
  if (!target.buffer) return null;
  return new Blob([target.buffer], { type: plan.mp4 ? "video/mp4" : "video/webm" });
}

function recordRealTime(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D): Promise<Blob> {
  const stream = canvas.captureStream(SAMPLE_FPS);
  const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  return new Promise((resolve, reject) => {
    rec.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
    };
    rec.onerror = () => reject(new Error("recording failed"));
    drawSample(g, 0);
    rec.start(250);
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= SAMPLE_SECONDS) return rec.stop();
      drawSample(g, t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
