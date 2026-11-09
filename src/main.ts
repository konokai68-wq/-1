import "./style.css";
import { LANG_NAMES, initLang, lang, onLangChange, setLang, t, tOr } from "./i18n";
import { fitFrame, type ZoomSegment } from "./layout";
import { download, exportCanvas, loadVideo, recordScreen, type ExportJob, type Recording } from "./media";
import { FORMATS, FRAME_RATES, RESOLUTIONS, exportSize, resolutionById, sanitizeSettings, type ExportSettings } from "./exportSettings";
import { GIF_FPS, GIF_MAX_SECONDS, gifSize, gifTooLong } from "./gif";
import { ASPECTS, BACKDROPS, canvasMeasure, drawFrame, type Backdrop, type CameraLayer, type Style } from "./render";
import {
  MIN_TEXT_LENGTH,
  TEXT_LOOKS,
  TEXT_SIZES,
  addText,
  arrowTipHit,
  moveArrowTip,
  moveText,
  textHit,
  textIndexAt,
  toggleArrow,
  type TextLook,
  type TextNote,
} from "./texts";
import { DEFAULT_BUBBLE, bubbleRect, nearestCorner, type Bubble, type BubbleShape, type Corner } from "./camera";
import { fullTrim, isFullTrim, playStart, setTrimEdge, type Edge, type Trim } from "./trim";
import { History } from "./history";
import { editSummary, sanitizeProject, timeAgo, type ProjectData, type SavedBackdrop } from "./project";
import { clearProject, loadProject, saveMedia, saveMeta, type SavedProject } from "./projectStore";
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

initLang();

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
const autoZoomBtn = $<HTMLButtonElement>("autoZoom");
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
const addTextBtn = $<HTMLButtonElement>("addText");
const textLane = $("textLane");
const textList = $<HTMLUListElement>("textList");
const textEmpty = $("textEmpty");
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
const resumeBox = $("resume");
const resumeBtn = $<HTMLButtonElement>("resumeBtn");
const discardBtn = $<HTMLButtonElement>("discardBtn");
const resumeInfo = $("resumeInfo");

const style: Style = { backdrop: BACKDROPS[0], padding: 0.08, radius: 0.025, shadow: 0.6 };
let zooms: ZoomSegment[] = [];
let trim: Trim = fullTrim(0);
let cuts: Span[] = [];
let speeds: SpeedSpan[] = [];
let texts: TextNote[] = [];
let hasVideo = false;
let recording: Recording | null = null;
let exporting: ExportJob | null = null;
let sourceBlob: Blob | null = null;
let cameraBlob: Blob | null = null;
let backdropBlob: Blob | null = null;
let sourceName = "Untitled";
/** Bumped whenever a video or the backdrop image changes, so autosave rewrites the Blobs. */
let mediaVersion = 0;
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
    texts,
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
  el.title = tOr(`bg.${b.id}`, b.name);
  el.dataset.i18nTitle = el.dataset.i18nAria = `bg.${b.id}`;
  el.setAttribute("role", "radio");
  el.setAttribute("aria-label", el.title);
  el.style.background = `linear-gradient(135deg, ${b.stops.join(", ")})`;
  el.setAttribute("aria-checked", String(b === style.backdrop));
  el.addEventListener("click", () => setBackdrop(b, el));
  swatches.append(el);
}
swatches.setAttribute("role", "radiogroup");
swatches.setAttribute("aria-label", t("backdrop"));
swatches.dataset.i18nAria = "backdrop";

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
    notify(t("msg.badImage"));
    return;
  }
  if (backdropUrl) URL.revokeObjectURL(backdropUrl);
  backdropUrl = url;
  backdropBlob = file;
  mediaVersion++;
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

for (const a of ASPECTS) {
  const o = new Option(tOr(`aspect.${a.id}`, a.label), a.id);
  o.dataset.i18n = `aspect.${a.id}`;
  aspectSelect.add(o);
}
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

/** A labelled radio button; `key` (when it is a dictionary key) keeps the label translated. */
function radio(group: HTMLElement, name: string, value: string, label: string, checked: boolean, onPick: () => void, key?: string) {
  const el = document.createElement("label");
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener("change", onPick);
  const text = document.createElement("span");
  text.textContent = key ? tOr(key, label) : label;
  if (key) text.dataset.i18n = key;
  el.append(input, text);
  group.append(el);
}

for (const f of FORMATS) {
  radio(formatGroup, "format", f.id, f.label, f.id === settings.format, () => {
    settings = { ...settings, format: f.id };
    saveSettings();
    updateExportInfo();
  }, `format.${f.id}`);
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
  if (!exporting) exportBtn.textContent = t(gif ? "export.gif" : "export.video");
  if (gif) {
    const g = gifSize({ width: canvas.width, height: canvas.height });
    exportInfo.textContent = t("export.gifInfo", { w: g.width, h: g.height, fps: GIF_FPS, max: GIF_MAX_SECONDS });
    return;
  }
  const s = outputSize();
  const hint = settings.frameRate === 30 ? ` ${t("export.faster")}` : "";
  exportInfo.textContent = t("export.info", { w: s.width, h: s.height, fps: settings.frameRate }) + hint;
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
  texts: TextNote[];
  frame: Pick<Style, (typeof FRAME_KEYS)[number]>;
}

const history = new History<EditState>();

function snapshot(): EditState {
  return {
    zooms: zooms.map((z) => ({ ...z })),
    trim: { ...trim },
    cuts: cuts.map((c) => ({ ...c })),
    speeds: speeds.map((s) => ({ ...s })),
    texts: texts.map((n) => ({ ...n, ...(n.arrow ? { arrow: { ...n.arrow } } : {}) })),
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
  texts = s.texts;
  for (const key of FRAME_KEYS) {
    style[key] = s.frame[key];
    $<HTMLInputElement>(key).value = String(s.frame[key]);
  }
  lastActive = -2;
  renderTrimUi();
  renderCutUi();
  renderSpeedUi();
  renderTextUi();
  syncHistoryUi();
}

function undo() {
  const s = history.undo(snapshot());
  if (!s) return notify(t("msg.nothingUndo"));
  restore(s);
  notify(t("msg.undone"));
}

function redo() {
  const s = history.redo(snapshot());
  if (!s) return notify(t("msg.nothingRedo"));
  restore(s);
  notify(t("msg.redone"));
}

function syncHistoryUi() {
  undoBtn.disabled = !hasVideo || !history.canUndo;
  redoBtn.disabled = !hasVideo || !history.canRedo;
}

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// ---- Loading media -----------------------------------------------------------

async function open(blob: Blob, camera: Blob | null = null, name = "Untitled"): Promise<boolean> {
  autoZoomJob?.cancel();
  try {
    await loadVideo(video, blob);
    sourceBlob = blob;
    sourceName = name;
    mediaVersion++;
    resumeBox.hidden = true;
    await setCamera(camera);
    hasVideo = true;
    zooms = [];
    cuts = [];
    speeds = [];
    texts = [];
    trim = fullTrim(video.duration);
    history.clear();
    syncHistoryUi();
    empty.hidden = true;
    for (const el of [exportBtn, playBtn, scrub, addZoomBtn, autoZoomBtn, addCutBtn, addSpeedBtn, addTextBtn, setInBtn, setOutBtn]) el.disabled = false;
    renderZoomUi();
    renderTrimUi();
    renderCutUi();
    renderSpeedUi();
    renderTextUi();
    notify(t("msg.loaded", { len: formatTime(video.duration) }));
    return true;
  } catch (err) {
    notify((err as Error).message);
    return false;
  }
}

fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) void open(f, null, f.name);
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
  if (f) void open(f, null, f.name);
  else if (img) void useBackdropImage(img);
  else notify(t("msg.dropHint"));
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
      notify(t("msg.badCamera"));
    }
  } else {
    camVideo.removeAttribute("src");
    camVideo.load();
  }
  camControls.hidden = !cameraBlob;
  camAddNote.hidden = !!cameraBlob;
  mediaVersion++;
}

const SHAPES: { id: BubbleShape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "rounded", label: "Rounded" },
];
for (const sh of SHAPES) {
  radio(camShape, "camShape", sh.id, sh.label, sh.id === bubble.shape, () => (bubble.shape = sh.id), `shape.${sh.id}`);
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
  b.title = tOr(`corner.${c.id}`, c.label);
  b.dataset.i18nTitle = b.dataset.i18nAria = `corner.${c.id}`;
  b.setAttribute("role", "radio");
  b.setAttribute("aria-label", b.title);
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
  notify(t("msg.camRemoved"));
});
camFile.addEventListener("change", async () => {
  const f = camFile.files?.[0];
  camFile.value = "";
  if (!f) return;
  if (!hasVideo) return notify(t("msg.camNeedsVideo"));
  await setCamera(f);
  if (cameraBlob) notify(t("msg.camAdded"));
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

// Drag a text callout (or its arrow tip) on the preview to move it (it is drawn above the bubble).
let textDrag: { pointerId: number; index: number; part: "box" | "tip"; dx: number; dy: number; moved: boolean } | null = null;
const measure = canvasMeasure(document.createElement("canvas").getContext("2d")!);

function tipUnder(x: number, y: number) {
  return hasVideo ? arrowTipHit(texts, video.currentTime, canvas, x, y) : -1;
}

function textUnder(x: number, y: number) {
  return hasVideo ? textHit(texts, video.currentTime, canvas, x, y, measure) : -1;
}

canvas.addEventListener("pointerdown", (e) => {
  const p = canvasPoint(e);
  const tip = exporting ? -1 : tipUnder(p.x, p.y);
  const i = tip >= 0 ? tip : exporting ? -1 : textUnder(p.x, p.y);
  if (i < 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  video.pause();
  // Leave the text box so keys (Ctrl/⌘ Z, Delete) act on the editor again.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  const n = texts[i];
  const at = tip >= 0 && n.arrow ? n.arrow : n;
  textDrag = { pointerId: e.pointerId, index: i, part: tip >= 0 ? "tip" : "box", dx: at.x * canvas.width - p.x, dy: at.y * canvas.height - p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("moving-text");
});
canvas.addEventListener("pointermove", (e) => {
  const p = canvasPoint(e);
  if (!textDrag) {
    canvas.classList.toggle("over-text", tipUnder(p.x, p.y) >= 0 || textUnder(p.x, p.y) >= 0);
    return;
  }
  if (e.pointerId !== textDrag.pointerId) return;
  e.stopImmediatePropagation();
  if (!textDrag.moved) checkpoint();
  textDrag.moved = true;
  const i = textDrag.index;
  const move = textDrag.part === "tip" ? moveArrowTip : moveText;
  texts[i] = move(texts[i], (p.x + textDrag.dx) / canvas.width, (p.y + textDrag.dy) / canvas.height);
});
const endTextDrag = (e: PointerEvent) => {
  if (!textDrag || e.pointerId !== textDrag.pointerId) return;
  e.stopImmediatePropagation();
  // A press on a callout never aims a zoom.
  suppressClick = true;
  textDrag = null;
  canvas.classList.remove("moving-text");
};
canvas.addEventListener("pointerup", endTextDrag);
canvas.addEventListener("pointercancel", endTextDrag);

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
    notify(t("msg.noRecord"));
    return;
  }
  try {
    recording = await recordScreen(true, camRecord.checked);
  } catch {
    notify(t("msg.recNotStarted"));
    return;
  }
  setRecording(true);
  if (recording.cameraError) notify(recording.cameraError);
  const [blob, camera] = await Promise.all([recording.done, recording.camera]);
  recording = null;
  setRecording(false);
  await open(blob, camera, `Screen recording ${new Date().toLocaleString()}`);
});

function setRecording(on: boolean) {
  recordBtn.setAttribute("aria-pressed", String(on));
  const label = recordBtn.querySelector<HTMLElement>(".label")!;
  label.dataset.i18n = on ? "rec.stop" : "rec.start";
  label.textContent = t(on ? "rec.stop" : "rec.start");
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
    case "addText": return addTextBtn.click();
    case "arrow": return arrowAtPlayhead();
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
  dd.textContent = tOr(`sc.${s.id}`, s.label);
  dd.dataset.i18n = `sc.${s.id}`;
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
let lastActiveText = -2;
function syncTransport() {
  const d = video.duration || 0;
  if (document.activeElement !== scrub) scrub.value = String(d ? Math.round((video.currentTime / d) * 1000) : 0);
  timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(d)}`;
  playIcon.setAttribute("d", video.paused ? "M6 4l10 6-10 6z" : "M5 4h3.5v12H5zM11.5 4H15v12h-3.5z");
  playBtn.setAttribute("aria-label", t(video.paused ? "play" : "pause"));
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
  const activeText = textIndexAt(texts, video.currentTime);
  if (activeText !== lastActiveText) {
    lastActiveText = activeText;
    markActiveText();
  }
}

// ---- Trim --------------------------------------------------------------------

function setTrim(edge: Edge) {
  checkpoint();
  trim = setTrimEdge(trim, edge, video.currentTime, video.duration);
  renderTrimUi();
  notify(t(edge === "start" ? "msg.trimStart" : "msg.trimEnd", { t: formatTimeFine(edge === "start" ? trim.start : trim.end) }));
}

setInBtn.addEventListener("click", () => setTrim("start"));
setOutBtn.addEventListener("click", () => setTrim("end"));
resetTrimBtn.addEventListener("click", () => {
  checkpoint();
  trim = fullTrim(video.duration);
  renderTrimUi();
  notify(t("msg.trimReset"));
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
    notify(t("msg.zoomExists"));
    return;
  }
  checkpoint();
  zooms = next;
  lastActive = -2;
});

// Auto zoom: scan the trimmed clip for local changes and add zooms there.
let autoZoomJob: { cancel(): void } | null = null;

autoZoomBtn.addEventListener("click", async () => {
  if (autoZoomJob) return autoZoomJob.cancel();
  if (!sourceBlob) return;
  autoZoomBtn.textContent = t("auto.cancel");
  notify(t("msg.autoScanning"), true);
  const { scanForZooms } = await import("./autoZoomScan");
  const job = scanForZooms({
    source: sourceBlob,
    range: { ...trim },
    cuts,
    existing: zooms,
    onProgress: (f) => notify(t("msg.autoProgress", { pct: Math.round(f * 100) }), true),
  });
  autoZoomJob = job;
  let found: ZoomSegment[] | null = null;
  let failed = false;
  try {
    found = await job.done;
  } catch (err) {
    console.error(err);
    failed = true;
  }
  autoZoomJob = null;
  autoZoomBtn.textContent = t("auto.zoom");
  if (failed) return notify(t("msg.autoFailed"));
  if (!found) return notify(t("msg.autoCancelled"));
  if (found.length === 0) return notify(t("msg.autoNone"));
  // Zooms added by hand while scanning win over suggestions that overlap them.
  found = found.filter((f) => !zooms.some((z) => f.start < z.end && z.start < f.end));
  if (found.length === 0) return notify(t("msg.autoOverlap"));
  checkpoint();
  zooms = [...zooms, ...found].sort((a, b) => a.start - b.start);
  lastActive = -2;
  notify(found.length === 1 ? t("msg.autoAdded1") : t("msg.autoAdded", { n: found.length }));
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
    return notify(t("msg.cutRemoved"));
  }
  const s = cutIndexAt(speeds, video.currentTime);
  if (s >= 0) {
    removeSpeed(s);
    return notify(t("msg.speedRemoved"));
  }
  const n = textIndexAt(texts, video.currentTime);
  if (n >= 0) {
    removeText(n);
    return notify(t("msg.textRemoved"));
  }
  const i = zoomIndexAt(zooms, video.currentTime);
  if (i < 0) return notify(t("msg.nothingHere"));
  removeZoom(i);
  notify(t("msg.zoomRemoved"));
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
  notify(t("msg.zoomAimed"));
});

// Drag a zoom's, cut's or speed-up's edge on the timeline to change its length.
// The pointer is captured by the lane (which is never re-created), so
// re-rendering the bars mid-drag is safe.
type LaneKind = "zoom" | "cut" | "speed" | "text";
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
    } else if (kind === "speed") {
      speeds = resizeZoom(speeds, drag.index, drag.edge, t, video.duration, MIN_SPEED_LENGTH);
      span = speeds[drag.index];
      renderSpeedUi();
    } else {
      texts = resizeZoom(texts, drag.index, drag.edge, t, video.duration, MIN_TEXT_LENGTH);
      span = texts[drag.index];
      renderTextLane();
    }
    // Show the frame at the edge being moved, just inside the span.
    video.currentTime = drag.edge === "start" ? span.start : Math.max(span.start, span.end - 0.05);
  });
  const end = (e: PointerEvent) => {
    if (!drag || drag.kind !== kind || e.pointerId !== drag.pointerId) return;
    const span = { zoom: zooms, cut: cuts, speed: speeds, text: texts }[kind][drag.index];
    drag = null;
    lane.classList.remove("dragging");
    if (kind === "cut") renderCutUi();
    if (kind === "speed") renderSpeedUi();
    if (kind === "text") renderTextUi();
    const what = ({ zoom: "msg.spanZoom", cut: "msg.spanCut", speed: "msg.spanSpeed", text: "msg.spanText" } as const)[kind];
    if (span) notify(t(what, { a: formatTimeFine(span.start), b: formatTimeFine(span.end) }));
  };
  lane.addEventListener("pointerup", end);
  lane.addEventListener("pointercancel", end);
}
laneDrag(zoomLane, "zoom");
laneDrag(cutLane, "cut");
laneDrag(speedLane, "speed");
laneDrag(textLane, "text");

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
    notify(t("msg.cutExists"));
    return;
  }
  checkpoint();
  cuts = next;
  renderCutUi();
  notify(t("msg.cutAdded"));
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
    notify(t("msg.speedExists"));
    return;
  }
  checkpoint();
  speeds = next;
  renderSpeedUi();
  notify(t("msg.speedAdded"));
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

// ---- Text callouts ------------------------------------------------------------

addTextBtn.addEventListener("click", () => {
  const next = addText(texts, video.currentTime, video.duration);
  if (next.length === texts.length) {
    notify(t("msg.textExists"));
    return;
  }
  checkpoint();
  video.pause();
  const added = next.find((n) => !texts.includes(n));
  texts = next;
  renderTextUi();
  // Start typing straight away.
  const input = textList.querySelector<HTMLInputElement>(`input[data-index="${added ? texts.indexOf(added) : 0}"]`);
  input?.focus();
  input?.select();
  notify(t("msg.textAdded"));
});

/** A: toggle the arrow on the callout at the playhead, or add a callout with an arrow. */
function arrowAtPlayhead() {
  if (!hasVideo) return;
  let i = textIndexAt(texts, video.currentTime);
  if (i < 0) {
    const next = addText(texts, video.currentTime, video.duration, "Look here");
    if (next.length === texts.length) return notify(t("msg.textNoRoom"));
    checkpoint();
    const added = next.find((n) => !texts.includes(n))!;
    texts = next;
    i = texts.indexOf(added);
  } else {
    checkpoint();
  }
  video.pause();
  texts[i] = toggleArrow(texts[i]);
  renderTextUi();
  notify(t(texts[i].arrow ? "msg.arrowAdded" : "msg.arrowRemoved"));
}

function removeText(i: number) {
  checkpoint();
  texts = texts.filter((_, j) => j !== i);
  renderTextUi();
}

function renderTextLane() {
  const active = textIndexAt(texts, video.currentTime);
  textLane.replaceChildren(...laneBars(texts, "text", active, "text"));
}

/** Highlight the callout at the playhead without rebuilding the list (keeps typing focus). */
function markActiveText() {
  const active = textIndexAt(texts, video.currentTime);
  textList.querySelectorAll("li").forEach((li, i) => li.classList.toggle("active", i === active));
  textLane.querySelectorAll("span").forEach((s, i) => s.classList.toggle("active", i === active || (drag?.kind === "text" && drag.index === i)));
}

function renderTextUi() {
  renderTextLane();
  textList.replaceChildren(
    ...texts.map((n, i) => {
      const li = document.createElement("li");
      const time = document.createElement("button");
      time.type = "button";
      time.className = "text-time";
      time.textContent = `${formatTimeFine(n.start)}–${formatTimeFine(n.end)}`;
      time.title = "Show this text";
      time.addEventListener("click", () => {
        video.pause();
        video.currentTime = Math.min(n.end - 0.05, n.start + 0.5);
      });
      const input = document.createElement("input");
      input.type = "text";
      input.value = n.text;
      input.maxLength = 140;
      input.dataset.index = String(i);
      input.setAttribute("aria-label", "Text");
      input.addEventListener("focus", () => {
        if (textIndexAt(texts, video.currentTime) !== i) {
          video.pause();
          video.currentTime = Math.min(texts[i].end - 0.05, texts[i].start + 0.5);
        }
      });
      input.addEventListener("input", () => {
        checkpoint(`text-${i}`);
        texts[i] = { ...texts[i], text: input.value };
      });
      const look = document.createElement("select");
      look.setAttribute("aria-label", "Text style");
      for (const k of TEXT_LOOKS) look.add(new Option(k.label, k.id, false, k.id === n.look));
      look.addEventListener("change", () => {
        checkpoint();
        texts[i] = { ...texts[i], look: look.value as TextLook };
      });
      const size = document.createElement("select");
      size.setAttribute("aria-label", "Text size");
      for (const z of TEXT_SIZES) size.add(new Option(z.label, String(z.value), false, z.value === n.size));
      size.addEventListener("change", () => {
        checkpoint();
        texts[i] = { ...texts[i], size: Number(size.value) };
      });
      const arrow = document.createElement("button");
      arrow.type = "button";
      arrow.className = "arrow-toggle";
      arrow.textContent = "Arrow";
      arrow.title = "Point at something with an arrow (A). Drag its tip on the preview.";
      arrow.setAttribute("aria-pressed", String(Boolean(n.arrow)));
      arrow.addEventListener("click", () => {
        checkpoint();
        texts[i] = toggleArrow(texts[i]);
        arrow.setAttribute("aria-pressed", String(Boolean(texts[i].arrow)));
        if (textIndexAt(texts, video.currentTime) !== i) {
          video.pause();
          video.currentTime = Math.min(texts[i].end - 0.05, texts[i].start + 0.5);
        }
      });
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", () => removeText(i));
      const row = document.createElement("div");
      row.className = "text-row";
      row.append(time, look, size, arrow, del);
      li.append(input, row);
      return li;
    }),
  );
  textEmpty.hidden = texts.length > 0;
  markActiveText();
}

// ---- Export ------------------------------------------------------------------

exportBtn.addEventListener("click", async () => {
  if (exporting) {
    exporting.cancel();
    return;
  }
  if (keptDuration(trim, cuts) < 0.2) {
    notify(t("msg.allCut"));
    return;
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  if (settings.format === "gif") {
    await exportGifPath(stamp);
    return;
  }
  exportBtn.textContent = t("export.cancel");
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
      (f) => notify(t("msg.realtime", { pct: Math.round(f * 100) }), true),
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
    notify(t("msg.exported", { ext: result.ext.toUpperCase() }));
  } else {
    notify(t("msg.exportCancelled"));
  }
});

async function exportGifPath(stamp: string) {
  if (!sourceBlob) return;
  if (gifTooLong(trim, cuts, speeds)) {
    notify(t("msg.gifTooLong", { max: GIF_MAX_SECONDS }));
    return;
  }
  exportBtn.textContent = t("export.cancel");
  const { exportGif } = await import("./gifExport");
  const job = exportGif({
    source: sourceBlob,
    size: gifSize({ width: canvas.width, height: canvas.height }),
    range: trim,
    cuts,
    speeds,
    draw: await styledDraw(),
    onProgress: (f) => notify(t("msg.gifProgress", { pct: Math.round(f * 100) }), true),
  });
  exporting = job;
  let blob: Blob | null = null;
  try {
    blob = await job.done;
  } catch (err) {
    console.error(err);
    notify(t("msg.gifFailed"));
  }
  releaseExportCamera();
  exporting = null;
  updateExportInfo();
  if (blob) {
    download(blob, `panreel-${stamp}.gif`);
    notify(t("msg.gifDone", { mb: (blob.size / 1048576).toFixed(1) }));
  } else if (!toast.textContent?.startsWith("GIF export failed")) {
    notify(t("msg.exportCancelled"));
  }
}

type Draw = (c: CanvasRenderingContext2D, frame: CanvasImageSource, frameSize: { width: number; height: number }, time: number) => Promise<void>;

let exportCamera: { dispose(): void } | null = null;

/** Frame renderer for the exporters, pulling camera frames when there is a camera. */
async function styledDraw(): Promise<Draw> {
  const cam = cameraBlob && bubble.visible ? await (await import("./cameraFrames")).openCameraFrames(cameraBlob) : null;
  exportCamera = cam;
  const b = { ...bubble };
  const notes = texts.map((n) => ({ ...n }));
  return async (c, frame, frameSize, time) => {
    const f = cam ? await cam.at(time) : null;
    drawFrame(c, frame, frameSize, style, zooms, time, f ? { ...f, bubble: b } : null, notes);
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
    onProgress: (f) => notify(t("msg.progress", { ext: plan.container.toUpperCase(), pct: Math.round(f * 100) }), true),
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

// ---- Autosave / resume ------------------------------------------------------

const FRAME_DEFAULTS = { padding: style.padding, radius: style.radius, shadow: style.shadow };
const PROJECT_DEFAULTS = { aspect: ASPECTS[0].id, bubble: DEFAULT_BUBBLE, frame: FRAME_DEFAULTS };

function savedBackdrop(): SavedBackdrop {
  const b = style.backdrop;
  if (b.kind === "gradient") return { kind: "gradient", id: b.id };
  if (b.kind === "solid") return { kind: "solid", color: b.color };
  return { kind: "image", blur: b.blur };
}

function projectData(): ProjectData {
  const s = snapshot();
  return {
    version: 1,
    name: sourceName,
    duration: video.duration,
    aspect: aspectSelect.value,
    frame: s.frame,
    backdrop: savedBackdrop(),
    bubble: { ...bubble },
    zooms: s.zooms,
    trim: s.trim,
    cuts: s.cuts,
    speeds: s.speeds,
    texts: s.texts,
  };
}

let savedJson = "";
let savedMediaVersion = -1;
let saving = false;
let saveFailed = false;

/** Write the project to IndexedDB when something changed since the last save. */
async function autosave() {
  if (!hasVideo || !sourceBlob || saving || !Number.isFinite(video.duration)) return;
  const json = JSON.stringify(projectData());
  const media = mediaVersion;
  if (json === savedJson && media === savedMediaVersion) return;
  saving = true;
  try {
    if (media !== savedMediaVersion) await saveMedia({ source: sourceBlob, camera: cameraBlob, backdrop: backdropBlob });
    await saveMeta(JSON.parse(json));
    savedJson = json;
    savedMediaVersion = media;
    saveFailed = false;
  } catch {
    if (!saveFailed) notify(t("msg.saveFailed"));
    saveFailed = true;
  } finally {
    saving = false;
  }
}
window.setInterval(() => void autosave(), 1500);
// Try once more when the tab is hidden or closed.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") void autosave();
});

function applyBackdrop(b: SavedBackdrop, image: Blob | null): Promise<void> | void {
  if (b.kind === "solid") {
    solidColor.value = b.color;
    return setBackdrop({ kind: "solid", color: b.color }, solidPick);
  }
  if (b.kind === "image" && image) {
    bgBlur.value = String(b.blur);
    return useBackdropImage(image);
  }
  const i = Math.max(0, BACKDROPS.findIndex((g) => b.kind === "gradient" && g.id === b.id));
  setBackdrop(BACKDROPS[i], swatches.querySelectorAll(".swatch")[i]);
}

function applyBubble(b: Bubble) {
  Object.assign(bubble, b);
  camShow.checked = b.visible;
  camMirror.checked = b.mirror;
  camSize.value = String(b.size);
  camShape.querySelectorAll<HTMLInputElement>("input").forEach((i) => (i.checked = i.value === b.shape));
  setCorner(b.corner);
}

let pending: SavedProject | null = null;

async function resume() {
  if (!pending) return;
  const saved = pending;
  const p = sanitizeProject(saved.data, PROJECT_DEFAULTS);
  if (!p) return discard();
  resumeBtn.disabled = true;
  const ok = await open(saved.media.source, saved.media.camera, p.name);
  resumeBtn.disabled = false;
  if (!ok) return;
  pending = null;
  const a = ASPECTS.find((x) => x.id === p.aspect) ?? ASPECTS[0];
  aspectSelect.value = a.id;
  canvas.width = a.size.width;
  canvas.height = a.size.height;
  updateExportInfo();
  await applyBackdrop(p.backdrop, saved.media.backdrop);
  applyBubble(p.bubble);
  restore({ zooms: p.zooms, trim: p.trim, cuts: p.cuts, speeds: p.speeds, texts: p.texts, frame: p.frame });
  // Re-saving the same Blobs is wasted work: they are already stored.
  savedMediaVersion = mediaVersion;
  savedJson = JSON.stringify(projectData());
  notify(t("msg.resumed", { name: p.name }));
}

async function discard() {
  pending = null;
  resumeBox.hidden = true;
  try {
    await clearProject();
  } catch {
    // Nothing to clear, or storage is blocked: either way there is no project to offer.
  }
}

resumeBtn.addEventListener("click", () => void resume());
discardBtn.addEventListener("click", () => void discard());

void loadProject().then((saved) => {
  if (!saved || hasVideo) return;
  const p = sanitizeProject(saved.data, PROJECT_DEFAULTS);
  if (!p) return;
  pending = saved;
  const edits = editSummary(p);
  resumeInfo.textContent = `${p.name} · ${formatTime(p.duration)}${edits ? ` · ${edits}` : ""} · saved ${timeAgo(saved.savedAt, Date.now())}`;
  resumeBox.hidden = false;
});

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

// ---- Language ----------------------------------------------------------------

const langBtn = $<HTMLButtonElement>("lang");
onLangChange((l) => {
  // The button offers the other language, written in that language.
  const other = l === "ja" ? "en" : "ja";
  langBtn.textContent = LANG_NAMES[other];
  langBtn.lang = other;
  autoZoomBtn.textContent = t(autoZoomJob ? "auto.cancel" : "auto.zoom");
  if (exporting) exportBtn.textContent = t("export.cancel");
  updateExportInfo();
  syncTransport();
});
langBtn.addEventListener("click", () => setLang(lang() === "ja" ? "en" : "ja"));
