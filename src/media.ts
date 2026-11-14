/** Browser media helpers: screen capture, loading and exporting video. */
import { t } from "./i18n";

export function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

export interface Recording {
  stop(): void;
  done: Promise<Blob>;
  /** The webcam clip recorded alongside, or null when no camera was used. */
  camera: Promise<Blob | null>;
  /** Why the camera could not be used, if it was asked for. */
  cameraError: string | null;
}

function startRecorder(stream: MediaStream, bitsPerSecond: number): { recorder: MediaRecorder; done: Promise<Blob> } {
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: bitsPerSecond } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };
  });
  return { recorder, done };
}

/**
 * Ask the browser for a screen, window or tab and record it until stopped.
 * With `withCamera`, the webcam is recorded too, as a separate clip that starts
 * at the same moment, so the bubble can still be styled afterwards.
 */
export async function recordScreen(withAudio: boolean, withCamera = false): Promise<Recording> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 60 },
    audio: withAudio,
  });
  let camStream: MediaStream | null = null;
  let cameraError: string | null = null;
  if (withCamera) {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
    } catch {
      cameraError = t("msg.camFailed");
    }
  }
  const screen = startRecorder(stream, 12_000_000);
  const cam = camStream ? startRecorder(camStream, 4_000_000) : null;
  const stop = () => {
    if (screen.recorder.state !== "inactive") screen.recorder.stop();
    if (cam && cam.recorder.state !== "inactive") cam.recorder.stop();
  };
  // The user can also end sharing from the browser's own UI.
  stream.getVideoTracks()[0]?.addEventListener("ended", stop);
  screen.recorder.start(1000);
  cam?.recorder.start(1000);
  return { stop, done: screen.done, camera: cam ? cam.done : Promise.resolve(null), cameraError };
}

/**
 * Load a blob into a <video> element and wait until its size and duration are
 * known. Recordings from MediaRecorder often report an infinite duration until
 * the browser has scanned the whole file, so we force that scan.
 */
export async function loadVideo(video: HTMLVideoElement, blob: Blob): Promise<void> {
  if (video.src.startsWith("blob:")) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(blob);
  video.muted = false;
  await once(video, "loadedmetadata");
  if (!Number.isFinite(video.duration)) {
    video.currentTime = Number.MAX_SAFE_INTEGER;
    await once(video, "durationchange");
  }
  // A paused video may not decode its first frame until it is asked for one, and
  // the preview would stay black; an explicit seek to 0 makes it available.
  video.currentTime = 0;
  await once(video, "seeked");
}

function once(el: EventTarget, type: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = () => (cleanup(), resolve());
    const fail = () => (cleanup(), reject(new Error(t("msg.badVideo"))));
    const cleanup = () => {
      el.removeEventListener(type, ok);
      el.removeEventListener("error", fail);
    };
    el.addEventListener(type, ok);
    el.addEventListener("error", fail);
  });
}

export interface ExportJob {
  cancel(): void;
  done: Promise<Blob | null>;
}

/**
 * Play the video from `range.start` to `range.end` and record the styled
 * canvas in real time. `onFrame` must redraw the canvas; it is called on every
 * animation frame.
 */
export function exportCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  range: { start: number; end: number },
  onFrame: () => void,
  onProgress: (fraction: number) => void,
  frameRate = 60,
  sound = true,
): ExportJob {
  const stream = canvas.captureStream(frameRate);
  const audio = sound ? captureAudio(video) : null;
  audio?.getAudioTracks().forEach((t) => stream.addTrack(t));

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 16_000_000 } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  let cancelled = false;
  let raf = 0;

  const done = new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      video.pause();
      resolve(cancelled ? null : new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };
  });

  const length = Math.max(0.001, range.end - range.start);
  const tick = () => {
    onFrame();
    onProgress(Math.min(1, Math.max(0, (video.currentTime - range.start) / length)));
    if (video.ended || video.currentTime >= range.end) recorder.state !== "inactive" && recorder.stop();
    else raf = requestAnimationFrame(tick);
  };

  video.pause();
  video.currentTime = range.start;
  video.addEventListener(
    "seeked",
    () => {
      recorder.start(1000);
      void video.play();
      tick();
    },
    { once: true },
  );

  return {
    cancel: () => {
      cancelled = true;
      if (recorder.state !== "inactive") recorder.stop();
    },
    done,
  };
}

const audioGraphs = new WeakMap<HTMLVideoElement, MediaStream>();

/** Route a video's sound into a stream, keeping it audible in the page. */
function captureAudio(video: HTMLVideoElement): MediaStream | null {
  const cached = audioGraphs.get(video);
  if (cached) return cached;
  try {
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(video);
    const dest = ctx.createMediaStreamDestination();
    src.connect(dest);
    src.connect(ctx.destination);
    audioGraphs.set(video, dest.stream);
    return dest.stream;
  } catch {
    return null;
  }
}

export function download(blob: Blob, name: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
