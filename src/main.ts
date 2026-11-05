import "./style.css";
import { fitFrame, type ZoomSegment } from "./layout";
import { download, exportCanvas, loadVideo, recordScreen, type ExportJob, type Recording } from "./media";
import { ASPECTS, BACKDROPS, drawFrame, type Backdrop, type Style } from "./render";
import { fullTrim, isFullTrim, playStart, setTrimEdge, type Edge, type Trim } from "./trim";
import { addZoom, formatTime, formatTimeFine, resizeZoom, zoomIndexAt } from "./zooms";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>("canvas");
const ctx = canvas.getContext("2d")!;
const video = $<HTMLVideoElement>("video");
const empty = $("empty");
const canvasWrap = $("canvasWrap");
const focusHint = $("focusHint");
const recordBtn = $<HTMLButtonElement>("record");
const fileInput = $<HTMLInputElement>("file");
const exportBtn = $<HTMLButtonElement>("export");
const playBtn = $<HTMLButtonElement>("play");
const playIcon = document.getElementById("playIcon")!;
const scrub = $<HTMLInputElement>("scrub");
const timeLabel = $("time");
const addZoomBtn = $<HTMLButtonElement>("addZoom");
const zoomLane = $("zoomLane");
const zoomList = $<HTMLUListElement>("zoomList");
const zoomEmpty = $("zoomEmpty");
const zoomTip = $("zoomTip");
const cutBefore = $("cutBefore");
const cutAfter = $("cutAfter");
const trimStartLabel = $("trimStart");
const trimEndLabel = $("trimEnd");
const setInBtn = $<HTMLButtonElement>("setIn");
const setOutBtn = $<HTMLButtonElement>("setOut");
const resetTrimBtn = $<HTMLButtonElement>("resetTrim");
const swatches = $("swatches");
const solidColor = $<HTMLInputElement>("solidColor");
const solidPick = $("solidPick");
const imagePick = $("imagePick");
const imageThumb = $("imageThumb");
const bgFile = $<HTMLInputElement>("bgFile");
const blurRow = $("blurRow");
const bgBlur = $<HTMLInputElement>("bgBlur");
const aspectSelect = $<HTMLSelectElement>("aspect");
const toast = $("toast");

const style: Style = { backdrop: BACKDROPS[0], padding: 0.08, radius: 0.025, shadow: 0.6 };
let zooms: ZoomSegment[] = [];
let trim: Trim = fullTrim(0);
let hasVideo = false;
let recording: Recording | null = null;
let exporting: ExportJob | null = null;
let sourceBlob: Blob | null = null;

// ---- Rendering -------------------------------------------------------------

function sourceSize() {
  return { width: video.videoWidth, height: video.videoHeight };
}

function render() {
  drawFrame(ctx, hasVideo ? video : null, hasVideo ? sourceSize() : { width: 16, height: 9 }, style, zooms, video.currentTime);
}

function loop() {
  render();
  syncTransport();
  requestAnimationFrame(loop);
}

// ---- Inspector ---------------------------------------------------------------

for (const b of BACKDROPS) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "swatch";
  el.title = b.name;
  el.setAttribute("role", "radio");
  el.setAttribute("aria-label", b.name);
  el.style.background = `linear-gradient(135deg, ${b.stops.join(", ")})`;
  el.setAttribute("aria-checked", String(b === style.backdrop));
  el.addEventListener("click", () => setBackdrop(b, el));
  swatches.append(el);
}
swatches.setAttribute("role", "radiogroup");
swatches.setAttribute("aria-label", "Backdrop");

/** Make `b` the active backdrop and mark `picked` as the selected control. */
function setBackdrop(b: Backdrop, picked: Element) {
  style.backdrop = b;
  swatches.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-checked", String(s === picked)));
  for (const p of [solidPick, imagePick]) p.classList.toggle("picked", p === picked);
  // ctx.filter is missing in some browsers; only offer blur where it works.
  blurRow.hidden = b.kind !== "image" || !("filter" in ctx);
}

bgBlur.addEventListener("input", () => {
  if (style.backdrop.kind === "image") style.backdrop.blur = Number(bgBlur.value);
});

solidColor.addEventListener("input", () => setBackdrop({ kind: "solid", color: solidColor.value }, solidPick));
solidColor.addEventListener("click", () => setBackdrop({ kind: "solid", color: solidColor.value }, solidPick));

let backdropUrl: string | null = null;
async function useBackdropImage(file: Blob) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    notify("Could not read that image. Try a PNG, JPEG or WebP file.");
    return;
  }
  if (backdropUrl) URL.revokeObjectURL(backdropUrl);
  backdropUrl = url;
  imageThumb.style.backgroundImage = `url("${url}")`;
  setBackdrop(
    { kind: "image", image: img, size: { width: img.naturalWidth, height: img.naturalHeight }, blur: Number(bgBlur.value) },
    imagePick,
  );
}
bgFile.addEventListener("change", () => {
  const f = bgFile.files?.[0];
  if (f) void useBackdropImage(f);
  bgFile.value = "";
});

for (const a of ASPECTS) aspectSelect.add(new Option(a.label, a.id));
aspectSelect.addEventListener("change", () => {
  const a = ASPECTS.find((x) => x.id === aspectSelect.value)!;
  canvas.width = a.size.width;
  canvas.height = a.size.height;
});

for (const key of ["padding", "radius", "shadow"] as const) {
  const input = $<HTMLInputElement>(key);
  input.value = String(style[key]);
  input.addEventListener("input", () => (style[key] = Number(input.value)));
}

// ---- Loading media -----------------------------------------------------------

async function open(blob: Blob) {
  try {
    await loadVideo(video, blob);
    sourceBlob = blob;
    hasVideo = true;
    zooms = [];
    trim = fullTrim(video.duration);
    empty.hidden = true;
    for (const el of [exportBtn, playBtn, scrub, addZoomBtn, setInBtn, setOutBtn]) el.disabled = false;
    renderZoomUi();
    renderTrimUi();
    notify(`Loaded a ${formatTime(video.duration)} clip. Add zooms, pick a backdrop, then export.`);
  } catch (err) {
    notify((err as Error).message);
  }
}

fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) void open(f);
  fileInput.value = "";
});

canvasWrap.addEventListener("dragover", (e) => {
  e.preventDefault();
  canvasWrap.classList.add("dragging");
});
canvasWrap.addEventListener("dragleave", () => canvasWrap.classList.remove("dragging"));
canvasWrap.addEventListener("drop", (e) => {
  e.preventDefault();
  canvasWrap.classList.remove("dragging");
  const files = [...(e.dataTransfer?.files ?? [])];
  const f = files.find((x) => x.type.startsWith("video/"));
  const img = files.find((x) => x.type.startsWith("image/"));
  if (f) void open(f);
  else if (img) void useBackdropImage(img);
  else notify("Drop a video (WebM or MP4) to edit, or an image to use as the backdrop.");
});

recordBtn.addEventListener("click", async () => {
  if (recording) {
    recording.stop();
    return;
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    notify("This browser cannot record the screen. Try Chrome, Edge or Firefox on a computer.");
    return;
  }
  try {
    recording = await recordScreen(true);
  } catch {
    notify("Recording did not start. Choose a screen, window or tab to share.");
    return;
  }
  setRecording(true);
  const blob = await recording.done;
  recording = null;
  setRecording(false);
  await open(blob);
});

function setRecording(on: boolean) {
  recordBtn.setAttribute("aria-pressed", String(on));
  recordBtn.querySelector(".label")!.textContent = on ? "Stop recording" : "Record screen";
}

// ---- Transport ---------------------------------------------------------------

playBtn.addEventListener("click", () => {
  if (!video.paused) return video.pause();
  video.currentTime = playStart(trim, video.currentTime);
  void video.play();
});
scrub.addEventListener("input", () => {
  if (video.duration) video.currentTime = (Number(scrub.value) / 1000) * video.duration;
});
document.addEventListener("keydown", (e) => {
  if (!hasVideo || exporting || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type !== "range")) return;
  if (e.code === "Space" && !(t instanceof HTMLInputElement || t instanceof HTMLButtonElement)) {
    e.preventDefault();
    playBtn.click();
  } else if (e.key === "i" || e.key === "I") {
    setTrim("start");
  } else if (e.key === "o" || e.key === "O") {
    setTrim("end");
  }
});

let lastActive = -2;
function syncTransport() {
  const d = video.duration || 0;
  if (document.activeElement !== scrub) scrub.value = String(d ? Math.round((video.currentTime / d) * 1000) : 0);
  timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(d)}`;
  playIcon.setAttribute("d", video.paused ? "M6 4l10 6-10 6z" : "M5 4h3.5v12H5zM11.5 4H15v12h-3.5z");
  playBtn.setAttribute("aria-label", video.paused ? "Play" : "Pause");
  // Stop at the trim end during normal playback (export handles its own range).
  if (!exporting && !video.paused && video.currentTime >= trim.end) {
    video.pause();
    video.currentTime = trim.end;
  }
  const active = zoomIndexAt(zooms, video.currentTime);
  if (active !== lastActive) {
    lastActive = active;
    renderZoomUi();
  }
}

// ---- Trim --------------------------------------------------------------------

function setTrim(edge: Edge) {
  trim = setTrimEdge(trim, edge, video.currentTime, video.duration);
  renderTrimUi();
  notify(edge === "start" ? `Clip now starts at ${formatTimeFine(trim.start)}.` : `Clip now ends at ${formatTimeFine(trim.end)}.`);
}

setInBtn.addEventListener("click", () => setTrim("start"));
setOutBtn.addEventListener("click", () => setTrim("end"));
resetTrimBtn.addEventListener("click", () => {
  trim = fullTrim(video.duration);
  renderTrimUi();
  notify("Keeping the whole clip.");
});

function renderTrimUi() {
  const d = video.duration || 1;
  cutBefore.style.width = `${(trim.start / d) * 100}%`;
  cutAfter.style.width = `${((d - trim.end) / d) * 100}%`;
  trimStartLabel.textContent = formatTimeFine(trim.start);
  trimEndLabel.textContent = formatTimeFine(trim.end);
  resetTrimBtn.hidden = isFullTrim(trim, video.duration);
}

// ---- Zooms -------------------------------------------------------------------

addZoomBtn.addEventListener("click", () => {
  const before = zooms.length;
  zooms = addZoom(zooms, video.currentTime, video.duration);
  if (zooms.length === before) notify("There is already a zoom here. Move the playhead to an empty spot.");
  lastActive = -2;
});

canvas.addEventListener("click", (e) => {
  const i = zoomIndexAt(zooms, video.currentTime);
  if (i < 0 || !hasVideo) return;
  // Map the click from canvas space into the video frame (unzoomed).
  const rect = canvas.getBoundingClientRect();
  const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const f = fitFrame(canvas, sourceSize(), style.padding);
  const fx = (cx - f.x) / f.width;
  const fy = (cy - f.y) / f.height;
  zooms[i] = { ...zooms[i], focusX: clamp01(fx), focusY: clamp01(fy) };
  notify("Zoom aimed.");
});

// Drag a zoom's edge on the timeline to change its length. The pointer is
// captured by the lane (which is never re-created), so re-rendering the bars
// mid-drag is safe.
let drag: { index: number; edge: Edge; pointerId: number } | null = null;

zoomLane.addEventListener("pointerdown", (e) => {
  const grip = (e.target as HTMLElement).closest<HTMLElement>(".grip");
  if (!grip || !hasVideo || exporting) return;
  e.preventDefault();
  video.pause();
  drag = { index: Number(grip.dataset.index), edge: grip.dataset.edge as Edge, pointerId: e.pointerId };
  zoomLane.setPointerCapture(e.pointerId);
  zoomLane.classList.add("dragging");
});

zoomLane.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const rect = zoomLane.getBoundingClientRect();
  const t = clamp01((e.clientX - rect.left) / rect.width) * video.duration;
  zooms = resizeZoom(zooms, drag.index, drag.edge, t, video.duration);
  const z = zooms[drag.index];
  // Show the frame at the edge being moved, just inside the zoom.
  video.currentTime = drag.edge === "start" ? z.start : Math.max(z.start, z.end - 0.05);
  renderZoomUi();
});

const endDrag = (e: PointerEvent) => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const z = zooms[drag.index];
  drag = null;
  zoomLane.classList.remove("dragging");
  if (z) notify(`Zoom now runs ${formatTimeFine(z.start)}–${formatTimeFine(z.end)}.`);
};
zoomLane.addEventListener("pointerup", endDrag);
zoomLane.addEventListener("pointercancel", endDrag);

function renderZoomUi() {
  const d = video.duration || 1;
  const active = zoomIndexAt(zooms, video.currentTime);
  zoomLane.replaceChildren(
    ...zooms.map((z, i) => {
      const s = document.createElement("span");
      s.style.left = `${(z.start / d) * 100}%`;
      s.style.width = `${((z.end - z.start) / d) * 100}%`;
      s.classList.toggle("active", i === active || drag?.index === i);
      for (const edge of ["start", "end"] as const) {
        const g = document.createElement("i");
        g.className = "grip";
        g.dataset.edge = edge;
        g.dataset.index = String(i);
        g.title = edge === "start" ? "Drag to change where this zoom starts" : "Drag to change where this zoom ends";
        s.append(g);
      }
      return s;
    }),
  );
  zoomList.replaceChildren(
    ...zooms.map((z, i) => {
      const li = document.createElement("li");
      li.classList.toggle("active", i === active);
      const label = document.createElement("button");
      label.type = "button";
      label.textContent = `${formatTime(z.start)}–${formatTime(z.end)}`;
      label.title = "Jump to this zoom";
      label.addEventListener("click", () => (video.currentTime = z.start + 0.7));
      const amount = document.createElement("select");
      amount.setAttribute("aria-label", "Zoom amount");
      for (const v of [1.4, 1.8, 2.4, 3]) amount.add(new Option(`${v}×`, String(v), false, v === z.scale));
      amount.addEventListener("change", () => (zooms[i] = { ...zooms[i], scale: Number(amount.value) }));
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        zooms = zooms.filter((_, j) => j !== i);
        lastActive = -2;
      });
      li.append(label, amount, del);
      return li;
    }),
  );
  zoomEmpty.hidden = zooms.length > 0;
  zoomTip.hidden = zooms.length === 0;
  focusHint.hidden = active < 0;
  canvas.classList.toggle("aiming", active >= 0);
}

// ---- Export ------------------------------------------------------------------

exportBtn.addEventListener("click", async () => {
  if (exporting) {
    exporting.cancel();
    return;
  }
  exportBtn.textContent = "Cancel export";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  let result: { blob: Blob | null; ext: string } | null = null;
  try {
    result = await exportFastPath();
  } catch (err) {
    console.warn("Fast export failed, falling back to real-time export.", err);
  }
  if (!result) {
    exporting = exportCanvas(canvas, video, trim, render, (f) =>
      notify(`Exporting in real time… ${Math.round(f * 100)}%. Keep this tab open.`, true),
    );
    result = { blob: await exporting.done, ext: "webm" };
  }
  exporting = null;
  exportBtn.textContent = "Export video";
  if (result.blob) {
    download(result.blob, `panreel-${stamp}.${result.ext}`);
    notify(`Exported ${result.ext.toUpperCase()}. Your video is in your downloads.`);
  } else {
    notify("Export cancelled.");
  }
});

/** Resolves to null when this browser can't do a WebCodecs export. */
async function exportFastPath(): Promise<{ blob: Blob | null; ext: string } | null> {
  if (!sourceBlob) return null;
  // Loaded on demand so the encoder library doesn't slow down the first page load.
  const { detectFastExport, exportFast } = await import("./fastExport");
  const size = { width: canvas.width, height: canvas.height };
  const plan = await detectFastExport(sourceBlob, size);
  if (!plan) return null;
  const started = performance.now();
  const job = exportFast({
    source: sourceBlob,
    size,
    plan,
    range: trim,
    frameRate: 60,
    draw: (c, frame, frameSize, time) => drawFrame(c, frame, frameSize, style, zooms, time),
    onProgress: (f) => notify(`Exporting ${plan.container.toUpperCase()}… ${Math.round(f * 100)}%`, true),
  });
  exporting = job;
  const blob = await job.done;
  console.info(`Exported in ${((performance.now() - started) / 1000).toFixed(1)} s`);
  return { blob, ext: job.extension };
}

// ---- Helpers -----------------------------------------------------------------

let toastTimer = 0;
function notify(msg: string, sticky = false) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  if (!sticky) toastTimer = window.setTimeout(() => (toast.hidden = true), 3500);
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

requestAnimationFrame(loop);
