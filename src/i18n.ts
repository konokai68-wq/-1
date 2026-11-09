/**
 * Tiny dictionary-based translations. English is the source language; any key
 * missing from another language falls back to English, so a partly translated
 * language never shows a blank label.
 */

export const LANGS = ["en", "ja"] as const;
export type Lang = (typeof LANGS)[number];

/** The name of each language, written in that language (for the switcher). */
export const LANG_NAMES: Record<Lang, string> = { en: "English", ja: "日本語" };

const en = {
  "meta.description": "Turn raw screen recordings into polished demo videos. Free, open source, and everything stays in your browser.",
  "lang.switch": "Language",
  tagline: "Polish screen recordings. Nothing leaves your browser.",
  "rec.start": "Record screen",
  "rec.stop": "Stop recording",
  "open.video": "Open video",
  export: "Export",
  "export.video": "Export video",
  "export.gif": "Export GIF",
  "export.cancel": "Cancel export",
  "export.info": "{w} × {h} at {fps} fps.",
  "export.faster": "Exports about twice as fast.",
  "export.gifInfo": "{w} × {h} at {fps} fps, loops forever. For clips up to {max} s.",
  preview: "Preview",
  "preview.canvas": "Video preview",
  "empty.title": "Drop a screen recording here",
  "empty.sub": "or record your screen, a window or a tab. WebM and MP4 work.",
  "resume.btn": "Resume last project",
  discard: "Discard",
  "focus.hint": "Click the preview to aim the zoom",
  play: "Play",
  pause: "Pause",
  "lane.zooms": "Zooms on the timeline. Drag a zoom's edges to change its length.",
  "lane.cuts": "Cuts on the timeline. Drag a cut's edges to change what it removes.",
  "lane.speeds": "Speed-ups on the timeline. Drag a speed-up's edges to change what it covers.",
  "lane.texts": "Text on the timeline. Drag a text bar's edges to change when it shows.",
  playhead: "Playhead",
  "add.zoom": "Add zoom here",
  "add.cut": "Cut here",
  "add.cut.title": "Cut 1 s at the playhead (X)",
  "add.speed": "Speed up",
  "add.speed.title": "Speed up 2 s at the playhead (S)",
  "add.text": "Add text",
  "add.text.title": "Add text at the playhead (T)",
  history: "History",
  undo: "Undo",
  "undo.title": "Undo (Ctrl/⌘ Z)",
  redo: "Redo",
  "redo.title": "Redo (Ctrl/⌘ Shift Z)",
  style: "Style",
  backdrop: "Backdrop",
  "solid.title": "Solid colour",
  "solid.aria": "Solid backdrop colour",
  colour: "Colour",
  "image.title": "Use your own image",
  image: "Image…",
  blur: "Blur",
  canvas: "Canvas",
  "canvas.size": "Canvas size",
  "export.format": "Export format",
  "export.resolution": "Export resolution",
  "export.frameRate": "Export frame rate",
  frame: "Frame",
  padding: "Padding",
  corners: "Corners",
  shadow: "Shadow",
  camera: "Camera",
  "cam.record": "Record my camera with the screen",
  "cam.show": "Show camera bubble",
  "cam.shape": "Bubble shape",
  size: "Size",
  "cam.position": "Bubble position",
  mirror: "Mirror",
  "cam.drag": "Drag the bubble on the preview to move it to another corner.",
  "cam.remove": "Remove camera",
  "cam.have": "Already have a camera clip?",
  "cam.add": "Add it to this video…",
  trim: "Trim",
  "trim.start": "Start",
  "trim.end": "End",
  "trim.set": "Set to playhead",
  "trim.note": "Press <kbd>I</kbd> or <kbd>O</kbd> to set the start or end.",
  "trim.reset": "Keep the whole clip",
  cuts: "Cuts",
  "cuts.empty": "Press <kbd>X</kbd> or Cut here to drop a second at the playhead, then drag the red bar's ends. Playback and exports skip cut parts.",
  speeds: "Speed-ups",
  "speeds.empty": "Press <kbd>S</kbd> or Speed up to fast-forward 2 s at the playhead (2×, 4× or 8×), then drag the teal bar's ends. Sped-up parts are muted.",
  text: "Text",
  "text.empty": "Press <kbd>T</kbd> or Add text to put a caption on screen for 3 s. Drag it on the preview to move it, press <kbd>A</kbd> or Arrow to point at something, and drag the violet bar's ends to change when it shows.",
  zooms: "Zooms",
  "zooms.empty": "Move the playhead to a moment worth a closer look, then press Add zoom here.",
  "zooms.tip": "Drag the ends of an orange bar on the timeline to make a zoom longer or shorter.",
  "auto.zoom": "Auto zoom",
  "auto.cancel": "Cancel scan",
  "auto.note": "Finds moments where only part of the screen changes and zooms in on them.",
  shortcuts: "Keyboard shortcuts",
  close: "Close",
  privacy: "Your video is processed on this device. Panreel has no server and no account.",
};

export type Key = keyof typeof en;

const ja: Partial<Record<Key, string>> = {
  "meta.description": "画面録画を、背景・ズーム付きのきれいなデモ動画に。無料・オープンソースで、動画はブラウザの外に出ません。",
  "lang.switch": "言語",
  tagline: "画面録画をきれいに仕上げる。動画はブラウザの外に出ません。",
  "rec.start": "画面を録画",
  "rec.stop": "録画を停止",
  "open.video": "動画を開く",
  export: "書き出し",
  "export.video": "動画を書き出し",
  "export.gif": "GIFを書き出し",
  "export.cancel": "書き出しを中止",
  "export.info": "{w} × {h}・{fps} fps。",
  "export.faster": "書き出しが約2倍速くなります。",
  "export.gifInfo": "{w} × {h}・{fps} fps・ループ再生。{max}秒までのクリップ向け。",
  preview: "プレビュー",
  "preview.canvas": "動画のプレビュー",
  "empty.title": "ここに画面録画をドロップ",
  "empty.sub": "または画面・ウィンドウ・タブを録画。WebM と MP4 に対応。",
  "resume.btn": "前回の続きから",
  discard: "破棄",
  "focus.hint": "プレビューをクリックしてズーム先を指定",
  play: "再生",
  pause: "一時停止",
  "lane.zooms": "タイムライン上のズーム。端をドラッグして長さを変更。",
  "lane.cuts": "タイムライン上のカット。端をドラッグして削る範囲を変更。",
  "lane.speeds": "タイムライン上の早送り。端をドラッグして範囲を変更。",
  "lane.texts": "タイムライン上の文字。端をドラッグして表示時間を変更。",
  playhead: "再生位置",
  "add.zoom": "ここにズーム",
  "add.cut": "ここをカット",
  "add.cut.title": "再生位置から1秒カット (X)",
  "add.speed": "早送り",
  "add.speed.title": "再生位置から2秒早送り (S)",
  "add.text": "文字を追加",
  "add.text.title": "再生位置に文字を追加 (T)",
  history: "履歴",
  undo: "元に戻す",
  "undo.title": "元に戻す (Ctrl/⌘ Z)",
  redo: "やり直し",
  "redo.title": "やり直し (Ctrl/⌘ Shift Z)",
  style: "スタイル",
  backdrop: "背景",
  "solid.title": "単色",
  "solid.aria": "背景の単色",
  colour: "色",
  "image.title": "自分の画像を使う",
  image: "画像…",
  blur: "ぼかし",
  canvas: "キャンバス",
  "canvas.size": "キャンバスの縦横比",
  "export.format": "書き出し形式",
  "export.resolution": "書き出し解像度",
  "export.frameRate": "書き出しフレームレート",
  frame: "フレーム",
  padding: "余白",
  corners: "角丸",
  shadow: "影",
  camera: "カメラ",
  "cam.record": "画面と一緒にカメラも録画",
  "cam.show": "カメラのワイプを表示",
  "cam.shape": "ワイプの形",
  size: "大きさ",
  "cam.position": "ワイプの位置",
  mirror: "左右反転",
  "cam.drag": "プレビュー上でワイプをドラッグすると別の角へ移動します。",
  "cam.remove": "カメラを外す",
  "cam.have": "カメラの動画がありますか?",
  "cam.add": "この動画に追加…",
  trim: "トリム",
  "trim.start": "開始",
  "trim.end": "終了",
  "trim.set": "再生位置にする",
  "trim.note": "<kbd>I</kbd> / <kbd>O</kbd> キーで開始・終了を設定。",
  "trim.reset": "全体を使う",
  cuts: "カット",
  "cuts.empty": "<kbd>X</kbd> か「ここをカット」で再生位置から1秒を削り、赤い帯の端をドラッグで調整。再生と書き出しではカット部分を飛ばします。",
  speeds: "早送り",
  "speeds.empty": "<kbd>S</kbd> か「早送り」で再生位置から2秒を早送り(2×・4×・8×)。青緑の帯の端をドラッグで調整。早送り中は無音になります。",
  text: "文字",
  "text.empty": "<kbd>T</kbd> か「文字を追加」で3秒間の字幕を表示。プレビュー上でドラッグして移動、<kbd>A</kbd> か Arrow で矢印を付け、紫の帯の端をドラッグで表示時間を調整。",
  zooms: "ズーム",
  "zooms.empty": "見せたい場面に再生位置を合わせて「ここにズーム」を押します。",
  "zooms.tip": "タイムラインのオレンジの帯の端をドラッグすると、ズームの長さを変えられます。",
  "auto.zoom": "自動ズーム",
  "auto.cancel": "スキャンを中止",
  "auto.note": "画面の一部だけが変わった場面を見つけて、そこにズームします。",
  shortcuts: "キーボードショートカット",
  close: "閉じる",
  privacy: "動画はこの端末の中で処理されます。Panreel にはサーバーもアカウントもありません。",
};

const DICTS: Record<Lang, Partial<Record<Key, string>>> = { en, ja };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/**
 * Choose the UI language: a `?lang=` query wins, then the saved choice, then
 * the first browser language we support, then English.
 */
export function pickLang(search: string, saved: string | null, browser: readonly string[]): Lang {
  const q = new URLSearchParams(search).get("lang");
  if (isLang(q)) return q;
  if (isLang(saved)) return saved;
  for (const b of browser) {
    const base = b.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

/** Look a key up in `lang`, falling back to English, and fill `{name}` slots. */
export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const s = DICTS[lang][key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Every key a language is missing (English is complete by definition). */
export function missingKeys(lang: Lang): Key[] {
  return (Object.keys(en) as Key[]).filter((k) => DICTS[lang][k] === undefined);
}

export function isKey(k: string): k is Key {
  return k in en;
}

// ---- Runtime state --------------------------------------------------------------

const STORE_KEY = "panreel.lang";
let current: Lang = "en";
const listeners: Array<(lang: Lang) => void> = [];

export function lang(): Lang {
  return current;
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  return translate(current, key, vars);
}

/** Run `fn` now and whenever the language changes. */
export function onLangChange(fn: (lang: Lang) => void) {
  listeners.push(fn);
  fn(current);
}

export function initLang() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORE_KEY);
  } catch {
    /* storage blocked: use the browser language */
  }
  current = pickLang(location.search, saved, navigator.languages ?? [navigator.language]);
  applyStatic(document);
}

export function setLang(next: Lang) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(STORE_KEY, next);
  } catch {
    /* not saved; still switch for this visit */
  }
  applyStatic(document);
  for (const fn of listeners) fn(next);
}

/**
 * Translate the fixed markup. Elements opt in with `data-i18n` (text),
 * `data-i18n-html` (trusted dictionary HTML such as <kbd>), `data-i18n-title`
 * and `data-i18n-aria` (aria-label).
 */
export function applyStatic(root: Document) {
  root.documentElement.lang = current;
  const desc = root.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (desc) desc.content = t("meta.description");
  const each = (attr: string, set: (el: HTMLElement, s: string) => void) => {
    root.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
      const k = el.getAttribute(attr)!;
      if (isKey(k)) set(el, t(k));
    });
  };
  each("data-i18n", (el, s) => (el.textContent = s));
  each("data-i18n-html", (el, s) => (el.innerHTML = s));
  each("data-i18n-title", (el, s) => (el.title = s));
  each("data-i18n-aria", (el, s) => el.setAttribute("aria-label", s));
}
