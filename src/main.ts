import "./style.css";
import { fitFrame, type ZoomSegment } from "./layout";
import { download, exportCanvas, loadVideo, recordScreen, type ExportJob, type Recording } from "./media";
import { FORMATS, FRAME_RATES, RESOLUTIONS, exportSize, resolutionById, sanitizeSettings, type ExportSettings } from "./exportSettings";
import { GIF_FPS, GIF_MAX_SECONDS, gifSize, gifTooLong } from "./gif";
import { ASPECTS, BACKDROPS, drawFrame, type Backdrop, type CameraLayer, type Style } from "./render";
import { DEFAULT_BUBBLE, bubbleRect, nearestCorner, type Bubble, type BubbleShape, type Corner } from "./camera";
import { fullTrim, isFullTrim, playStart, setTrimEdge, type Edge, type Trim } from "./trim";
import { History } from "./history";
import { SHORTCUTS, actionFor, type Action } from "./shortcuts";
import {
  MIN_CUT_LENGTH,
  MIN_SPEED_LENGTH,
  SPEED_RATES,
  addCut,
  addSpeed,
  cutIndexAt,
  keptDuration,
  rateAt,
  skipCuts,
  type Span,
  type SpeedSpan,
} from "./cuts";
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
const addCutBtn = $<HTMLButtonElement>("addCut");
const cutLane = $("cutLane");
const cutList = $<HTMLUListElement>("cutList");
const cutEmpty = $("cutEmpty");
const cutResult = $("cutResult");
const cutBefore = $("cutBefore");
const cutAfter = $("cutAfter");
const addSpeedBtn = $<HTMLButtonElement>("addSpeed");
const speedLane = $("speedLane");
const speedList = $<HTMLUListElement>("speedList");
const speedEmpty = $("speedEmpty");
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
const resolutionGroup = $("resolution");
const frameRateGroup = $("frameRate");
const formatGroup = $("format");
const exportInfo = $("exportInfo");
const undoBtn = $<HTMLButtonElement>("undo");
const redoBtn = $<HTMLButtonElement>("redo");
const shortcutsDialog = $<HTMLDialogElement>("shortcuts");
const shortcutList = $("shortcutList");
const shortcutsBtn = $<HTMLButtonElement>("showShortcuts");
const camVideo = $<HTMLVideoElement>("camVideo");
const camRecord = $<HTMLInputElement>("camRecord");
const camControls = $("camControls");
const camShow = $<HTMLInputElement>("camShow");
const camShape = $("camShape");
const camSize = $<HTMLInputElement>("camSize");
const camCorner = $("camCorner");
const camMirror = $<HTMLInputElement>("camMirror");
const camRemove = $<HTMLButtonElement>("camRemove");
const camFile = $<HTMLInputElement>("camFile");
const camAddNote = $("camAddNote");

const style: Style = { backdrop: BACKDROPS[0], padding: 0.08, radius: 0.025, shadow: 0.6 };
let zooms: ZoomSegment[] = [];
let trim: Trim = fullTrim(0);
let cuts: Span[] = [];
let speeds: SpeedSpan[] = [];
let hasVideo = false;
let recording: Recording | null = null;
let exporting: ExportJob | null = null;
let sourceBlob: Blob | null = null;
let cameraBlob: Blob | null = null;
const bubble: Bubble = { ...DEFAULT_BUBBLE };

// ---- Rendering -------------------------------------------------------------

function sourceSize() {
  return { width: video.videoWidth, height: video.videoHeight };
}

function previewCamera(): CameraLayer | null {
  if (!cameraBlob || camVideo.readyState < 2) return null;
  return { image: camVideo, size: { width: camVideo.videoWidth, height: camVideo.videoHeight }, bubble };
}

function render() {
  syncCamera();
  drawFrame(
    ctx,
    hasVideo ? video : null,
    hasVideo ? sourceSize() : { width: 16, height: 9 },
    style,
    zooms,
    video.currentTime,
    previewCamera(),
  );
}

/** Keep the camera clip in step with the screen clip (both start at 0). */
function syncCamera() {
  if (!cameraBlob || !camVideo.duration) return;
  const target = Math.min(video.currentTime, camVideo.duration);
  const playing = !video.paused && !video.ended && video.currentTime < camVideo.duration;
  if (camVideo.playbackRate !== video.playbackRate) camVideo.playbackRate = video.playbackRate;
  if (playing && camVideo.paused) void camVideo.play().catch(() => {});
  if (!playing && !camVideo.paused) camVideo.pause();
  const drift = Math.abs(camVideo.currentTime - target);
  if (!camVideo.seeking && drift > (playing ? 0.2 : 0.02)) camVideo.currentTime = target;
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
  updateExportInfo();
});

// ---- Export settings ---------------------------------------------------------

const SETTINGS_KEY = "panreel.export";
let settings: ExportSettings = sanitizeSettings(readSaved());

function readSaved(): unknown {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
  } catch {
    return null;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or blocked storage: the choice just won't be remembered.
  }
}

function radio(group: HTMLElement, name: string, value: string, label: string, checked: boolean, onPick: () => void) {
  const el = document.createElement("label");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener("change", onPick);
  el.append(input, label);
  group.append(el);
}

for (const f of FORMATS) {
  radio(formatGroup, "format", f.id, f.label, f.id === settings.format, () => {
    settings = { ...settings, format: f.id };
    saveSettings();
    updateExportInfo();
  });
}
for (const r of RESOLUTIONS) {
  radio(resolutionGroup, "resolution", r.id, r.label, r.id === settings.resolution, () => {
    settings = { ...settings, resolution: r.id };
    saveSettings();
    updateExportInfo();
  });
}
for (const fps of FRAME_RATES) {
  radio(frameRateGroup, "frameRate", String(fps), `${fps} fps`, fps === settings.frameRate, () => {
    settings = { ...settings, frameRate: fps };
    saveSettings();
    updateExportInfo();
  });
}

/** Output size for the current canvas shape and chosen resolution. */
function outputSize() {
  return exportSize({ width: canvas.width, height: canvas.height }, resolutionById(settings.resolution).short);
}

function updateExportInfo() {
  const gif = settings.format === "gif";
  resolutionGroup.hidden = gif;
  frameRateGroup.hidden = gif;
  if (!exporting) exportBtn.textContent = gif ? "Export GIF" : "Export video";
  if (gif) {
    const g = gifSize({ width: canvas.width, height: canvas.height });
    exportInfo.textContent = `${g.width} × ${g.height} at ${GIF_FPS} fps, loops forever. For clips up to ${GIF_MAX_SECONDS} s.`;
    return;
  }
  const s = outputSize();
  const hint = settings.frameRate === 30 ? " Exports about twice as fast." : "";
  exportInfo.textContent = `${s.width} × ${s.height} at ${settings.frameRate} fps.${hint}`;
}
updateExportInfo();

for (const key of ["padding", "radius", "shadow"] as const) {
  const input = $<HTMLInputElement>(key);
  input.value = String(style[key]);
  input.addEventListener("input", () => {
    checkpoint(key);
    style[key] = Number(input.value);
  });
}

// ---- Undo / redo -------------------------------------------------------------

const FRAME_KEYS = ["padding", "radius", "shadow"] as const;

/** Everything undo / redo restores: the timeline edits and the frame sliders. */
interface EditState {
  zooms: ZoomSegment[];
  trim: Trim;
  cuts: Span[];
  speeds: SpeedSpan[];
  frame: Pick<Style, (typeof FRAME_KEYS)[number]>;
}

const history = new History<EditState>();

function snapshot(): EditState {
  return {
    zooms: zooms.map((z) => ({ ...z })),
    trim: { ...trim },
    cuts: cuts.map((c) => ({ ...c })),
    speeds: speeds.map((s) => ({ ...s })),
    frame: { padding: style.padding, radius: style.radius, shadow: style.shadow },
  };
}

/** Save the current state as an undo step. Call before changing anything. */
function checkpoint(key: string | null = null) {
  if (!hasVideo) return;
  history.record(snapshot(), key);
  syncHistoryUi();
}

function restore(s: EditState) {
  zooms = s.zooms;
  trim = s.trim;
  cuts = s.cuts;
  speeds = s.speeds;
  for (const key of FRAME_KEYS) {
    style[key] = s.frame[key];
    $<HTMLInputElement>(key).value = String(s.frame[key]);
  }
  lastActive = -2;
  renderTrimUi();
  renderCutUi();
  renderSpeedUi();
  syncHistoryUi();
}

function undo() {
  const s = history.undo(snapshot());
  if (!s) return notify("Nothing to undo.");
  restore(s);
  notify("Undone.");
}

function redo() {
  const s = history.redo(snapshot());
  if (!s) return notify("Nothing to redo.");
  restore(s);
  notify("Redone.");
}

function syncHistoryUi() {
  undoBtn.disabled = !hasVideo || !history.canUndo;
  redoBtn.disabled = !hasVideo || !history.canRedo;
}

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// ---- Loading media -----------------------------------------------------------

async function open(blob: Blob, camera: Blob | null = null) {
  try {
    await loadVideo(video, blob);
    sourceBlob = blob;
    await setCamera(camera);
    hasVideo = true;
    zooms = [];
    cuts = [];
    speeds = [];
    trim = fullTrim(video.duration);
    history.clear();
    syncHistoryUi();
    empty.hidden = true;
    for (const el of [exportBtn, playBtn, scrub, addZoomBtn, addCutBtn, addSpeedBtn, setInBtn, setOutBtn]) el.disabled = false;
    renderZoomUi();
    renderTrimUi();
    renderCutUi();
    renderSpeedUi();
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

// ---- Camera bubble -----------------------------------------------------------

async function setCamera(blob: Blob | null) {
  if (camVideo.src.startsWith("blob:")) URL.revokeObjectURL(camVideo.src);
  cameraBlob = null;
  if (blob) {
    try {
      await loadVideo(camVideo, blob);
      camVideo.muted = true;
      cameraBlob = blob;
    } catch {
      notify("That camera clip could not be opened. Try a WebM or MP4 file.");
    }
  } else {
    camVideo.removeAttribute("src");
    camVideo.load();
  }
  camControls.hidden = !cameraBlob;
  camAddNote.hidden = !!cameraBlob;
}

const SHAPES: { id: BubbleShape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "rounded", label: "Rounded" },
];
for (const sh of SHAPES) {
  radio(camShape, "camShape", sh.id, sh.label, sh.id === bubble.shape, () => (bubble.shape = sh.id));
}

const CORNERS: { id: Corner; label: string }[] = [
  { id: "tl", label: "Top left" },
  { id: "tr", label: "Top right" },
  { id: "bl", label: "Bottom left" },
  { id: "br", label: "Bottom right" },
];
for (const c of CORNERS) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.corner = c.id;
  b.title = c.label;
  b.setAttribute("role", "radio");
  b.setAttribute("aria-label", c.label);
  b.addEventListener("click", () => setCorner(c.id));
  camCorner.append(b);
}

function setCorner(c: Corner) {
  bubble.corner = c;
  camCorner.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.corner === c)));
}
setCorner(bubble.corner);

camShow.addEventListener("change", () => (bubble.visible = camShow.checked));
camMirror.addEventListener("change", () => (bubble.mirror = camMirror.checked));
camSize.addEventListener("input", () => (bubble.size = Number(camSize.value)));
camRemove.addEventListener("click", () => {
  void setCamera(null);
  notify("Camera removed from this video.");
});
camFile.addEventListener("change", async () => {
  const f = camFile.files?.[0];
  camFile.value = "";
  if (!f) return;
  if (!hasVideo) return notify("Open or record a screen video first, then add the camera clip.");
  await setCamera(f);
  if (cameraBlob) notify("Camera added. It starts at the same moment as the screen video.");
});

/** Is the canvas point (in canvas pixels) on the visible bubble? */
function onBubble(x: number, y: number) {
  if (!cameraBlob || !bubble.visible) return false;
  const r = bubbleRect(canvas, bubble);
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

function canvasPoint(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let bubbleDrag: { pointerId: number; moved: boolean } | null = null;
let suppressClick = false;

canvas.addEventListener("pointerdown", (e) => {
  const p = canvasPoint(e);
  if (!onBubble(p.x, p.y) || exporting) return;
  e.preventDefault();
  bubbleDrag = { pointerId: e.pointerId, moved: false };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("moving-bubble");
});
canvas.addEventListener("pointermove", (e) => {
  const p = canvasPoint(e);
  if (!bubbleDrag) {
    canvas.classList.toggle("over-bubble", onBubble(p.x, p.y));
    return;
  }
  if (e.pointerId !== bubbleDrag.pointerId) return;
  bubbleDrag.moved = true;
  const c = nearestCorner(canvas, p.x, p.y);
  if (c !== bubble.corner) setCorner(c);
});
const endBubbleDrag = (e: PointerEvent) => {
  if (!bubbleDrag || e.pointerId !== bubbleDrag.pointerId) return;
  // A press on the bubble never aims a zoom.
  suppressClick = true;
  bubbleDrag = null;
  canvas.classList.remove("moving-bubble");
};
canvas.addEventListener("pointerup", endBubbleDrag);
canvas.addEventListener("pointercancel", endBubbleDrag);

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
    recording = await recordScreen(true, camRecord.checked);
  } catch {
    notify("Recording did not start. Choose a screen, window or tab to share.");
    return;
  }
  setRecording(true);
  if (recording.cameraError) notify(recording.cameraError);
  const [blob, camera] = await Promise.all([recording.done, recording.camera]);
  recording = null;
  setRecording(false);
  await open(blob, camera);
});

function setRecording(on: boolean) {
  recordBtn.setAttribute("aria-pressed", String(on));
  recordBtn.querySelector(".label")!.textContent = on ? "Stop recording" : "Record screen";
}

// ---- Transport ---------------------------------------------------------------

playBtn.addEventListener("click", () => {
  if (!video.paused) return video.pause();
  video.currentTime = playFrom(video.currentTime);
  void video.play();
});
scrub.addEventListener("input", () => {
  if (video.duration) video.currentTime = (Number(scrub.value) / 1000) * video.duration;
});
document.addEventListener("keydown", (e) => {
  const action = actionFor(e);
  if (!action || (e.repeat && (action === "undo" || action === "redo"))) return;
  const t = e.target;
  // Leave typing, pickers and native control keys alone.
  if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type !== "range")) return;
  const onControl = t instanceof HTMLInputElement || t instanceof HTMLButtonElement;
  if (onControl && ["play", "back", "forward", "backLong", "forwardLong", "toStart", "toEnd"].includes(action)) return;
  if (action === "help") {
    e.preventDefault();
    toggleShortcuts();
    return;
  }
  if (!hasVideo || exporting || shortcutsDialog.open) return;
  e.preventDefault();
  runAction(action);
});

function runAction(action: Action) {
  const step = (dt: number) => {
    video.pause();
    video.currentTime = Math.min(video.duration, Math.max(0, video.currentTime + dt));
  };
  switch (action) {
    case "undo": return undo();
    case "redo": return redo();
    case "play": return playBtn.click();
    case "setIn": return setTrim("start");
    case "setOut": return setTrim("end");
    case "addZoom": return addZoomBtn.click();
    case "addCut": return addCutBtn.click();
    case "addSpeed": return addSpeedBtn.click();
    case "remove": return removeAtPlayhead();
    case "back": return step(-0.1);
    case "forward": return step(0.1);
    case "backLong": return step(-1);
    case "forwardLong": return step(1);
    case "toStart":
      video.pause();
      video.currentTime = trim.start;
      return;
    case "toEnd":
      video.pause();
      video.currentTime = trim.end;
      return;
  }
}

for (const s of SHORTCUTS) {
  const dt = document.createElement("dt");
  for (const k of s.keys) {
    const kbd = document.createElement("kbd");
    kbd.textContent = k;
    dt.append(kbd);
  }
  const dd = document.createElement("dd");
  dd.textContent = s.label;
  shortcutList.append(dt, dd);
}

function toggleShortcuts() {
  if (shortcutsDialog.open) shortcutsDialog.close();
  else shortcutsDialog.showModal();
}
shortcutsBtn.addEventListener("click", toggleShortcuts);
shortcutsDialog.addEventListener("click", (e) => {
  // Clicking the backdrop (outside the panel) closes the dialog.
  if (e.target === shortcutsDialog) shortcutsDialog.close();
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
  // Jump over cut-away parts while playing (and during a real-time export).
  if (!video.paused && !video.seeking && cutIndexAt(cuts, video.currentTime) >= 0) {
    video.currentTime = Math.min(trim.end, skipCuts(cuts, video.currentTime));
  }
  // Play sped-up parts faster, muted (exports turn them into silence too).
  const rate = rateAt(speeds, video.currentTime);
  if (video.playbackRate !== rate) {
    video.playbackRate = rate;
    video.muted = rate !== 1;
    renderSpeedUi();
  }
  const active = zoomIndexAt(zooms, video.currentTime);
  if (active !== lastActive) {
    lastActive = active;
    renderZoomUi();
  }
}

// ---- Trim --------------------------------------------------------------------

function setTrim(edge: Edge) {
  checkpoint();
  trim = setTrimEdge(trim, edge, video.currentTime, video.duration);
  renderTrimUi();
  notify(edge === "start" ? `Clip now starts at ${formatTimeFine(trim.start)}.` : `Clip now ends at ${formatTimeFine(trim.end)}.`);
}

setInBtn.addEventListener("click", () => setTrim("start"));
setOutBtn.addEventListener("click", () => setTrim("end"));
resetTrimBtn.addEventListener("click", () => {
  checkpoint();
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
  renderCutResult();
}

// ---- Zooms -------------------------------------------------------------------

addZoomBtn.addEventListener("click", () => {
  const next = addZoom(zooms, video.currentTime, video.duration);
  if (next.length === zooms.length) {
    notify("There is already a zoom here. Move the playhead to an empty spot.");
    return;
  }
  checkpoint();
  zooms = next;
  lastActive = -2;
});

function removeZoom(i: number) {
  checkpoint();
  zooms = zooms.filter((_, j) => j !== i);
  lastActive = -2;
}

function removeAtPlayhead() {
  const c = cutIndexAt(cuts, video.currentTime);
  if (c >= 0) {
    removeCut(c);
    return notify("Cut removed. Press Ctrl/⌘ Z to bring it back.");
  }
  const s = cutIndexAt(speeds, video.currentTime);
  if (s >= 0) {
    removeSpeed(s);
    return notify("Speed-up removed. Press Ctrl/⌘ Z to bring it back.");
  }
  const i = zoomIndexAt(zooms, video.currentTime);
  if (i < 0) return notify("No zoom, cut or speed-up at the playhead.");
  removeZoom(i);
  notify("Zoom removed. Press Ctrl/⌘ Z to bring it back.");
}

canvas.addEventListener("click", (e) => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const i = zoomIndexAt(zooms, video.currentTime);
  if (i < 0 || !hasVideo) return;
  // Map the click from canvas space into the video frame (unzoomed).
  const rect = canvas.getBoundingClientRect();
  const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const f = fitFrame(canvas, sourceSize(), style.padding);
  const fx = (cx - f.x) / f.width;
  const fy = (cy - f.y) / f.height;
  checkpoint();
  zooms[i] = { ...zooms[i], focusX: clamp01(fx), focusY: clamp01(fy) };
  notify("Zoom aimed.");
});

// Drag a zoom's, cut's or speed-up's edge on the timeline to change its length.
// The pointer is captured by the lane (which is never re-created), so
// re-rendering the bars mid-drag is safe.
type LaneKind = "zoom" | "cut" | "speed";
let drag: { kind: LaneKind; index: number; edge: Edge; pointerId: number } | null = null;

function laneDrag(lane: HTMLElement, kind: LaneKind) {
  lane.addEventListener("pointerdown", (e) => {
    const grip = (e.target as HTMLElement).closest<HTMLElement>(".grip");
    if (!grip || !hasVideo || exporting) return;
    e.preventDefault();
    video.pause();
    checkpoint();
    drag = { kind, index: Number(grip.dataset.index), edge: grip.dataset.edge as Edge, pointerId: e.pointerId };
    lane.setPointerCapture(e.pointerId);
    lane.classList.add("dragging");
  });
  lane.addEventListener("pointermove", (e) => {
    if (!drag || drag.kind !== kind || e.pointerId !== drag.pointerId) return;
    const rect = lane.getBoundingClientRect();
    const t = clamp01((e.clientX - rect.left) / rect.width) * video.duration;
    let span: Span;
    if (kind === "zoom") {
      zooms = resizeZoom(zooms, drag.index, drag.edge, t, video.duration);
      span = zooms[drag.index];
      renderZoomUi();
    } else if (kind === "cut") {
      cuts = resizeZoom(cuts, drag.index, drag.edge, t, video.duration, MIN_CUT_LENGTH);
      span = cuts[drag.index];
      renderCutUi();
    } else {
      speeds = resizeZoom(speeds, drag.index, drag.edge, t, video.duration, MIN_SPEED_LENGTH);
      span = speeds[drag.index];
      renderSpeedUi();
    }
    // Show the frame at the edge being moved, just inside the span.
    video.currentTime = drag.edge === "start" ? span.start : Math.max(span.start, span.end - 0.05);
  });
  const end = (e: PointerEvent) => {
    if (!drag || drag.kind !== kind || e.pointerId !== drag.pointerId) return;
    const span = (kind === "zoom" ? zooms : kind === "cut" ? cuts : speeds)[drag.index];
    drag = null;
    lane.classList.remove("dragging");
    if (kind === "cut") renderCutUi();
    if (kind === "speed") renderSpeedUi();
    const what = { zoom: "Zoom now runs", cut: "Cut now removes", speed: "Speed-up now covers" }[kind];
    if (span) notify(`${what} ${formatTimeFine(span.start)}–${formatTimeFine(span.end)}.`);
  };
  lane.addEventListener("pointerup", end);
  lane.addEventListener("pointercancel", end);
}
laneDrag(zoomLane, "zoom");
laneDrag(cutLane, "cut");
laneDrag(speedLane, "speed");

/** Timeline bars with drag grips, one per span. */
function laneBars(spans: readonly Span[], kind: LaneKind, active: number, noun: string): HTMLElement[] {
  const d = video.duration || 1;
  return spans.map((z, i) => {
    const s = document.createElement("span");
    s.style.left = `${(z.start / d) * 100}%`;
    s.style.width = `${((z.end - z.start) / d) * 100}%`;
    s.classList.toggle("active", i === active || (drag?.kind === kind && drag.index === i));
    for (const edge of ["start", "end"] as const) {
      const g = document.createElement("i");
      g.className = "grip";
      g.dataset.edge = edge;
      g.dataset.index = String(i);
      g.title = `Drag to change where this ${noun} ${edge === "start" ? "starts" : "ends"}`;
      s.append(g);
    }
    return s;
  });
}

function renderZoomUi() {
  const active = zoomIndexAt(zooms, video.currentTime);
  zoomLane.replaceChildren(...laneBars(zooms, "zoom", active, "zoom"));
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
      amount.addEventListener("change", () => {
        checkpoint();
        zooms[i] = { ...zooms[i], scale: Number(amount.value) };
      });
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", () => removeZoom(i));
      li.append(label, amount, del);
      return li;
    }),
  );
  zoomEmpty.hidden = zooms.length > 0;
  zoomTip.hidden = zooms.length === 0;
  focusHint.hidden = active < 0;
  canvas.classList.toggle("aiming", active >= 0);
}

// ---- Cuts --------------------------------------------------------------------

/** Where to start playing: inside the trim and outside any cut. */
function playFrom(t: number) {
  const at = skipCuts(cuts, playStart(trim, t));
  return at >= trim.end - 0.05 ? skipCuts(cuts, trim.start) : at;
}

addCutBtn.addEventListener("click", () => {
  const next = addCut(cuts, video.currentTime, video.duration);
  if (next.length === cuts.length) {
    notify("There is already a cut here. Move the playhead to a part you want to keep.");
    return;
  }
  checkpoint();
  cuts = next;
  renderCutUi();
  notify("Cut 1 s. Drag the red bar's ends on the timeline to cut more or less.");
});

function removeCut(i: number) {
  checkpoint();
  cuts = cuts.filter((_, j) => j !== i);
  renderCutUi();
}

function renderCutUi() {
  const active = cutIndexAt(cuts, video.currentTime);
  cutLane.replaceChildren(...laneBars(cuts, "cut", active, "cut"));
  cutList.replaceChildren(
    ...cuts.map((c, i) => {
      const li = document.createElement("li");
      const label = document.createElement("button");
      label.type = "button";
      label.textContent = `${formatTimeFine(c.start)}–${formatTimeFine(c.end)}`;
      label.title = "Show where this cut starts";
      label.addEventListener("click", () => {
        video.pause();
        video.currentTime = c.start;
      });
      const len = document.createElement("span");
      len.className = "cut-len";
      len.textContent = `−${(c.end - c.start).toFixed(1)} s`;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", () => removeCut(i));
      li.append(label, len, del);
      return li;
    }),
  );
  cutEmpty.hidden = cuts.length > 0;
  renderCutResult();
}

function renderCutResult() {
  const kept = keptDuration(trim, cuts);
  const result = keptDuration(trim, cuts, speeds);
  const parts: string[] = [];
  if (cuts.length) parts.push(`${formatTimeFine(trim.end - trim.start - kept)} cut`);
  if (speeds.length) parts.push(`${formatTimeFine(kept - result)} saved by speed-ups`);
  cutResult.hidden = parts.length === 0;
  cutResult.textContent = `Result: ${formatTimeFine(result)} (${parts.join(", ")}).`;
}

// ---- Speed-ups ---------------------------------------------------------------

addSpeedBtn.addEventListener("click", () => {
  const next = addSpeed(speeds, video.currentTime, video.duration);
  if (next.length === speeds.length) {
    notify("There is already a speed-up here. Move the playhead to a normal-speed part.");
    return;
  }
  checkpoint();
  speeds = next;
  renderSpeedUi();
  notify("Sped up 2 s at 4×. Drag the teal bar's ends on the timeline to cover more or less.");
});

function removeSpeed(i: number) {
  checkpoint();
  speeds = speeds.filter((_, j) => j !== i);
  renderSpeedUi();
}

function renderSpeedUi() {
  const active = cutIndexAt(speeds, video.currentTime);
  const bars = laneBars(speeds, "speed", active, "speed-up");
  bars.forEach((b, i) => (b.dataset.rate = `${speeds[i].rate}×`));
  speedLane.replaceChildren(...bars);
  speedList.replaceChildren(
    ...speeds.map((s, i) => {
      const li = document.createElement("li");
      li.classList.toggle("active", i === active);
      const label = document.createElement("button");
      label.type = "button";
      label.textContent = `${formatTimeFine(s.start)}–${formatTimeFine(s.end)}`;
      label.title = "Show where this speed-up starts";
      label.addEventListener("click", () => {
        video.pause();
        video.currentTime = s.start;
      });
      const rate = document.createElement("select");
      rate.setAttribute("aria-label", "Speed");
      for (const v of SPEED_RATES) rate.add(new Option(`${v}×`, String(v), false, v === s.rate));
      rate.addEventListener("change", () => {
        checkpoint();
        speeds[i] = { ...speeds[i], rate: Number(rate.value) };
        renderSpeedUi();
      });
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", () => removeSpeed(i));
      li.append(label, rate, del);
      return li;
    }),
  );
  speedEmpty.hidden = speeds.length > 0;
  renderCutResult();
}

// ---- Export ------------------------------------------------------------------

exportBtn.addEventListener("click", async () => {
  if (exporting) {
    exporting.cancel();
    return;
  }
  if (keptDuration(trim, cuts) < 0.2) {
    notify("Everything is cut. Remove a cut or keep more of the clip before exporting.");
    return;
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  if (settings.format === "gif") {
    await exportGifPath(stamp);
    return;
  }
  exportBtn.textContent = "Cancel export";
  let result: { blob: Blob | null; ext: string } | null = null;
  try {
    result = await exportFastPath();
  } catch (err) {
    console.warn("Fast export failed, falling back to real-time export.", err);
  }
  if (!result) {
    // Record the preview canvas itself, temporarily resized to the export size.
    const preview = { width: canvas.width, height: canvas.height };
    const size = outputSize();
    canvas.width = size.width;
    canvas.height = size.height;
    exporting = exportCanvas(
      canvas,
      video,
      trim,
      render,
      (f) => notify(`Exporting in real time… ${Math.round(f * 100)}%. Keep this tab open.`, true),
      settings.frameRate,
    );
    result = { blob: await exporting.done, ext: "webm" };
    canvas.width = preview.width;
    canvas.height = preview.height;
  }
  exporting = null;
  updateExportInfo();
  if (result.blob) {
    download(result.blob, `panreel-${stamp}.${result.ext}`);
    notify(`Exported ${result.ext.toUpperCase()}. Your video is in your downloads.`);
  } else {
    notify("Export cancelled.");
  }
});

async function exportGifPath(stamp: string) {
  if (!sourceBlob) return;
  if (gifTooLong(trim, cuts, speeds)) {
    notify(`GIFs are limited to ${GIF_MAX_SECONDS} s. Trim the clip (I / O keys) or export a video instead.`);
    return;
  }
  exportBtn.textContent = "Cancel export";
  const { exportGif } = await import("./gifExport");
  const job = exportGif({
    source: sourceBlob,
    size: gifSize({ width: canvas.width, height: canvas.height }),
    range: trim,
    cuts,
    speeds,
    draw: await styledDraw(),
    onProgress: (f) => notify(`Exporting GIF… ${Math.round(f * 100)}%`, true),
  });
  exporting = job;
  let blob: Blob | null = null;
  try {
    blob = await job.done;
  } catch (err) {
    console.error(err);
    notify("GIF export failed in this browser. Try exporting a video instead.");
  }
  releaseExportCamera();
  exporting = null;
  updateExportInfo();
  if (blob) {
    download(blob, `panreel-${stamp}.gif`);
    notify(`Exported GIF (${(blob.size / 1048576).toFixed(1)} MB). It's in your downloads.`);
  } else if (!toast.textContent?.startsWith("GIF export failed")) {
    notify("Export cancelled.");
  }
}

type Draw = (c: CanvasRenderingContext2D, frame: CanvasImageSource, frameSize: { width: number; height: number }, time: number) => Promise<void>;

let exportCamera: { dispose(): void } | null = null;

/** Frame renderer for the exporters, pulling camera frames when there is a camera. */
async function styledDraw(): Promise<Draw> {
  const cam = cameraBlob && bubble.visible ? await (await import("./cameraFrames")).openCameraFrames(cameraBlob) : null;
  exportCamera = cam;
  const b = { ...bubble };
  return async (c, frame, frameSize, time) => {
    const f = cam ? await cam.at(time) : null;
    drawFrame(c, frame, frameSize, style, zooms, time, f ? { ...f, bubble: b } : null);
  };
}

function releaseExportCamera() {
  exportCamera?.dispose();
  exportCamera = null;
}

/** Resolves to null when this browser can't do a WebCodecs export. */
async function exportFastPath(): Promise<{ blob: Blob | null; ext: string } | null> {
  if (!sourceBlob) return null;
  // Loaded on demand so the encoder library doesn't slow down the first page load.
  const { detectFastExport, exportFast } = await import("./fastExport");
  const size = outputSize();
  const plan = await detectFastExport(sourceBlob, size);
  if (!plan) return null;
  const started = performance.now();
  const job = exportFast({
    source: sourceBlob,
    size,
    plan,
    range: trim,
    cuts,
    speeds,
    frameRate: settings.frameRate,
    draw: await styledDraw(),
    onProgress: (f) => notify(`Exporting ${plan.container.toUpperCase()}… ${Math.round(f * 100)}%`, true),
  });
  exporting = job;
  let blob: Blob | null;
  try {
    blob = await job.done;
  } finally {
    releaseExportCamera();
  }
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
