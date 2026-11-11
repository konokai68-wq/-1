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
  "sample.btn": "No recording yet? Try a sample clip",
  "sample.making": "Making the sample clip…",
  "perk.local": "Your videos never leave this device",
  "perk.free": "Free and open source (MIT)",
  "perk.install": "No install, no account",
  "source.link": "Source code on GitHub",
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
  window: "Window",
  "window.none": "None",
  "window.light": "Light",
  "window.dark": "Dark",
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
  "msg.badImage": "Could not read that image. Try a PNG, JPEG or WebP file.",
  "msg.nothingUndo": "Nothing to undo.",
  "msg.undone": "Undone.",
  "msg.nothingRedo": "Nothing to redo.",
  "msg.redone": "Redone.",
  "msg.loaded": "Loaded a {len} clip. Add zooms, pick a backdrop, then export.",
  "msg.sample": "Sample clip loaded. Press Auto zoom, or Space to play.",
  "msg.sampleFail": "Could not make the sample clip in this browser: {err}",
  "msg.dropHint": "Drop a video (WebM or MP4) to edit, or an image to use as the backdrop.",
  "msg.badVideo": "This video could not be opened. Try a WebM or MP4 file.",
  "msg.badCamera": "That camera clip could not be opened. Try a WebM or MP4 file.",
  "msg.camRemoved": "Camera removed from this video.",
  "msg.camNeedsVideo": "Open or record a screen video first, then add the camera clip.",
  "msg.camAdded": "Camera added. It starts at the same moment as the screen video.",
  "msg.camFailed": "The camera could not be used, so only the screen is being recorded.",
  "msg.noRecord": "This browser cannot record the screen. Try Chrome, Edge or Firefox on a computer.",
  "msg.recNotStarted": "Recording did not start. Choose a screen, window or tab to share.",
  "msg.trimStart": "Clip now starts at {t}.",
  "msg.trimEnd": "Clip now ends at {t}.",
  "msg.trimReset": "Keeping the whole clip.",
  "msg.zoomExists": "There is already a zoom here. Move the playhead to an empty spot.",
  "msg.autoScanning": "Looking for moments to zoom in on…",
  "msg.autoProgress": "Looking for moments to zoom in on… {pct}%",
  "msg.autoFailed": "Auto zoom couldn't read this video in this browser.",
  "msg.autoCancelled": "Auto zoom cancelled.",
  "msg.autoNone": "No spots to zoom on: nothing changed in a small enough area. Add zooms by hand instead.",
  "msg.autoOverlap": "Auto zoom found only spots that already have a zoom.",
  "msg.autoAdded1": "Added 1 zoom. Adjust or remove it on the timeline, or press Ctrl/⌘ Z to undo.",
  "msg.autoAdded": "Added {n} zooms. Adjust or remove them on the timeline, or press Ctrl/⌘ Z to undo.",
  "msg.cutRemoved": "Cut removed. Press Ctrl/⌘ Z to bring it back.",
  "msg.speedRemoved": "Speed-up removed. Press Ctrl/⌘ Z to bring it back.",
  "msg.textRemoved": "Text removed. Press Ctrl/⌘ Z to bring it back.",
  "msg.zoomRemoved": "Zoom removed. Press Ctrl/⌘ Z to bring it back.",
  "msg.nothingHere": "No zoom, cut, speed-up or text at the playhead.",
  "msg.zoomAimed": "Zoom aimed.",
  "msg.spanZoom": "Zoom now runs {a}–{b}.",
  "msg.spanCut": "Cut now removes {a}–{b}.",
  "msg.spanSpeed": "Speed-up now covers {a}–{b}.",
  "msg.spanText": "Text now shows {a}–{b}.",
  "msg.cutExists": "There is already a cut here. Move the playhead to a part you want to keep.",
  "msg.cutAdded": "Cut 1 s. Drag the red bar's ends on the timeline to cut more or less.",
  "msg.speedExists": "There is already a speed-up here. Move the playhead to a normal-speed part.",
  "msg.speedAdded": "Sped up 2 s at 4×. Drag the teal bar's ends on the timeline to cover more or less.",
  "msg.textExists": "There is already text here. Move the playhead to a spot without text.",
  "msg.textAdded": "Text added for 3 s. Type your words, drag the text on the preview to move it.",
  "msg.textNoRoom": "No room for text here. Move the playhead.",
  "msg.arrowAdded": "Arrow added. Drag its tip on the preview to point at something.",
  "msg.arrowRemoved": "Arrow removed.",
  "msg.allCut": "Everything is cut. Remove a cut or keep more of the clip before exporting.",
  "msg.realtime": "Exporting in real time… {pct}%. Keep this tab open.",
  "msg.exported": "Exported {ext}. Your video is in your downloads.",
  "msg.exportCancelled": "Export cancelled.",
  "msg.gifTooLong": "GIFs are limited to {max} s. Trim the clip (I / O keys) or export a video instead.",
  "msg.gifProgress": "Exporting GIF… {pct}%",
  "msg.gifFailed": "GIF export failed in this browser. Try exporting a video instead.",
  "msg.gifDone": "Exported GIF ({mb} MB). It's in your downloads.",
  "msg.progress": "Exporting {ext}… {pct}%",
  "msg.saveFailed": "This browser could not keep a copy of the project (storage full or blocked). Export to keep your work.",
  "msg.resumed": "Resumed “{name}”. Your edits are saved in this browser as you go.",
  "sc.play": "Play / pause",
  "sc.step": "Step 0.1 s (Shift: 1 s)",
  "sc.ends": "Go to clip start / end",
  "sc.trim": "Set clip start / end",
  "sc.zoom": "Add zoom at playhead",
  "sc.cut": "Cut 1 s at playhead",
  "sc.speed": "Speed up 2 s at playhead",
  "sc.text": "Add text at playhead",
  "sc.arrow": "Arrow on / off for text at playhead",
  "sc.remove": "Remove cut, speed-up, text or zoom at playhead",
  "sc.undo": "Undo",
  "sc.redo": "Redo",
  "sc.help": "Show shortcuts",
  "bg.harbor": "Harbor",
  "bg.dusk": "Dusk",
  "bg.moss": "Moss",
  "bg.sunbeam": "Sunbeam",
  "bg.graphite": "Graphite",
  "bg.paper": "Paper",
  "aspect.16:9": "Widescreen 16:9",
  "aspect.1:1": "Square 1:1",
  "aspect.9:16": "Vertical 9:16",
  "aspect.4:3": "Classic 4:3",
  "format.video": "Video",
  "format.gif": "GIF",
  "shape.circle": "Circle",
  "shape.rounded": "Rounded",
  "corner.tl": "Top left",
  "corner.tr": "Top right",
  "corner.bl": "Bottom left",
  "corner.br": "Bottom right",  "row.remove": "Remove",
  "row.jumpZoom": "Jump to this zoom",
  "row.showCut": "Show where this cut starts",
  "row.showSpeed": "Show where this speed-up starts",
  "row.showText": "Show this text",
  "row.arrow": "Arrow",
  "row.arrowTip": "Point at something with an arrow (A). Drag its tip on the preview.",
  "row.zoomAmount": "Zoom amount",
  "row.speed": "Speed",
  "row.text": "Text",
  "row.textStyle": "Text style",
  "row.textSize": "Text size",
  "row.cutLen": "−{s} s",
  "grip.zoom.start": "Drag to change where this zoom starts",
  "grip.zoom.end": "Drag to change where this zoom ends",
  "grip.cut.start": "Drag to change where this cut starts",
  "grip.cut.end": "Drag to change where this cut ends",
  "grip.speed.start": "Drag to change where this speed-up starts",
  "grip.speed.end": "Drag to change where this speed-up ends",
  "grip.text.start": "Drag to change when this text starts",
  "grip.text.end": "Drag to change when this text ends",
  "look.dark": "Dark",
  "look.light": "Light",
  "look.accent": "Blue",
  "result.line": "Result: {len} ({parts}).",
  "result.cut": "{len} cut",
  "result.saved": "{len} saved by speed-ups",
  "result.sep": ", ",
  "resume.saved": "saved {ago}",
  "sum.zoom": "{n} zoom",
  "sum.zooms": "{n} zooms",
  "sum.cut": "{n} cut",
  "sum.cuts": "{n} cuts",
  "sum.speed": "{n} speed-up",
  "sum.speeds": "{n} speed-ups",
  "sum.text": "{n} text",
  "sum.texts": "{n} texts",
  "ago.now": "just now",
  "ago.min": "{n} min ago",
  "ago.h": "{n} h ago",
  "ago.days": "{n} days ago",
  "left.few": "a few seconds left",
  "left.s": "about {n} s left",
  "left.min": "about {n} min left",
};

export type Key = keyof typeof en;

/** Every dictionary key (English is complete by definition). */
export const KEYS = Object.keys(en) as Key[];

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
  "sample.btn": "録画がまだない? サンプル動画で試す",
  "sample.making": "サンプル動画を作成中…",
  "perk.local": "動画はこの端末の外に出ません",
  "perk.free": "無料・オープンソース(MIT)",
  "perk.install": "インストールもアカウントも不要",
  "source.link": "GitHub でソースコードを見る",
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
  window: "ウィンドウ枠",
  "window.none": "なし",
  "window.light": "明るい",
  "window.dark": "暗い",
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
  "msg.badImage": "画像を読み込めませんでした。PNG・JPEG・WebP を試してください。",
  "msg.nothingUndo": "元に戻す操作はありません。",
  "msg.undone": "元に戻しました。",
  "msg.nothingRedo": "やり直す操作はありません。",
  "msg.redone": "やり直しました。",
  "msg.loaded": "{len} の動画を読み込みました。ズームを付けて背景を選び、書き出しましょう。",
  "msg.sample": "サンプル動画を読み込みました。「自動ズーム」を押すか、スペースキーで再生してみましょう。",
  "msg.sampleFail": "このブラウザではサンプル動画を作れませんでした: {err}",
  "msg.dropHint": "編集する動画(WebM / MP4)か、背景にする画像をドロップしてください。",
  "msg.badVideo": "この動画を開けませんでした。WebM か MP4 を試してください。",
  "msg.badCamera": "カメラの動画を開けませんでした。WebM か MP4 を試してください。",
  "msg.camRemoved": "この動画からカメラを外しました。",
  "msg.camNeedsVideo": "先に画面の動画を開くか録画してから、カメラの動画を追加してください。",
  "msg.camAdded": "カメラを追加しました。画面の動画と同時に始まります。",
  "msg.camFailed": "カメラを使えなかったため、画面だけを録画しています。",
  "msg.noRecord": "このブラウザでは画面を録画できません。パソコンの Chrome・Edge・Firefox を試してください。",
  "msg.recNotStarted": "録画が始まりませんでした。共有する画面・ウィンドウ・タブを選んでください。",
  "msg.trimStart": "開始を {t} にしました。",
  "msg.trimEnd": "終了を {t} にしました。",
  "msg.trimReset": "動画全体を使います。",
  "msg.zoomExists": "ここには既にズームがあります。空いている場所へ再生位置を移してください。",
  "msg.autoScanning": "ズームする場面を探しています…",
  "msg.autoProgress": "ズームする場面を探しています… {pct}%",
  "msg.autoFailed": "このブラウザでは、自動ズームがこの動画を読み込めませんでした。",
  "msg.autoCancelled": "自動ズームを中止しました。",
  "msg.autoNone": "ズームする場面が見つかりませんでした(画面の一部だけが変わる場面がありません)。手動でズームを追加してください。",
  "msg.autoOverlap": "見つかった場面には、すべて既にズームがあります。",
  "msg.autoAdded1": "ズームを1個追加しました。タイムラインで調整・削除するか、Ctrl/⌘ Z で元に戻せます。",
  "msg.autoAdded": "ズームを{n}個追加しました。タイムラインで調整・削除するか、Ctrl/⌘ Z で元に戻せます。",
  "msg.cutRemoved": "カットを削除しました。Ctrl/⌘ Z で元に戻せます。",
  "msg.speedRemoved": "早送りを削除しました。Ctrl/⌘ Z で元に戻せます。",
  "msg.textRemoved": "文字を削除しました。Ctrl/⌘ Z で元に戻せます。",
  "msg.zoomRemoved": "ズームを削除しました。Ctrl/⌘ Z で元に戻せます。",
  "msg.nothingHere": "再生位置にズーム・カット・早送り・文字はありません。",
  "msg.zoomAimed": "ズーム先を決めました。",
  "msg.spanZoom": "ズーム: {a}–{b}",
  "msg.spanCut": "カット: {a}–{b} を削除",
  "msg.spanSpeed": "早送り: {a}–{b}",
  "msg.spanText": "文字: {a}–{b} に表示",
  "msg.cutExists": "ここは既にカットされています。残したい部分へ再生位置を移してください。",
  "msg.cutAdded": "1秒カットしました。タイムラインの赤い帯の端をドラッグして範囲を調整できます。",
  "msg.speedExists": "ここは既に早送りです。通常速度の部分へ再生位置を移してください。",
  "msg.speedAdded": "2秒を4×で早送りにしました。タイムラインの青緑の帯の端をドラッグして範囲を調整できます。",
  "msg.textExists": "ここには既に文字があります。文字の無い場所へ再生位置を移してください。",
  "msg.textAdded": "3秒間の文字を追加しました。文字を入力し、プレビュー上でドラッグして移動できます。",
  "msg.textNoRoom": "ここには文字を置けません。再生位置を移してください。",
  "msg.arrowAdded": "矢印を付けました。プレビュー上で先端をドラッグして指す場所を決められます。",
  "msg.arrowRemoved": "矢印を外しました。",
  "msg.allCut": "全体がカットされています。書き出す前にカットを減らすか、トリム範囲を広げてください。",
  "msg.realtime": "実時間で書き出し中… {pct}%。このタブは開いたままにしてください。",
  "msg.exported": "{ext} を書き出しました。ダウンロードに保存されています。",
  "msg.exportCancelled": "書き出しを中止しました。",
  "msg.gifTooLong": "GIF は{max}秒までです。トリム(I / O キー)するか、動画で書き出してください。",
  "msg.gifProgress": "GIF を書き出し中… {pct}%",
  "msg.gifFailed": "このブラウザでは GIF を書き出せませんでした。動画で書き出してください。",
  "msg.gifDone": "GIF({mb} MB)を書き出しました。ダウンロードに保存されています。",
  "msg.progress": "{ext} を書き出し中… {pct}%",
  "msg.saveFailed": "このブラウザにプロジェクトを保存できませんでした(容量不足またはブロック)。作業を残すには書き出してください。",
  "msg.resumed": "「{name}」を再開しました。編集内容はこのブラウザに自動で保存されます。",
  "sc.play": "再生 / 一時停止",
  "sc.step": "0.1秒移動(Shift: 1秒)",
  "sc.ends": "開始 / 終了へ移動",
  "sc.trim": "開始 / 終了を設定",
  "sc.zoom": "再生位置にズームを追加",
  "sc.cut": "再生位置から1秒カット",
  "sc.speed": "再生位置から2秒早送り",
  "sc.text": "再生位置に文字を追加",
  "sc.arrow": "再生位置の文字の矢印を付ける / 外す",
  "sc.remove": "再生位置のカット・早送り・文字・ズームを削除",
  "sc.undo": "元に戻す",
  "sc.redo": "やり直し",
  "sc.help": "ショートカット一覧を表示",
  "bg.harbor": "ハーバー",
  "bg.dusk": "夕暮れ",
  "bg.moss": "モス",
  "bg.sunbeam": "陽だまり",
  "bg.graphite": "グラファイト",
  "bg.paper": "ペーパー",
  "aspect.16:9": "横長 16:9",
  "aspect.1:1": "正方形 1:1",
  "aspect.9:16": "縦長 9:16",
  "aspect.4:3": "標準 4:3",
  "format.video": "動画",
  "format.gif": "GIF",
  "shape.circle": "円",
  "shape.rounded": "角丸",
  "corner.tl": "左上",
  "corner.tr": "右上",
  "corner.bl": "左下",
  "corner.br": "右下",  "row.remove": "削除",
  "row.jumpZoom": "このズームへ移動",
  "row.showCut": "このカットの開始位置を表示",
  "row.showSpeed": "この早送りの開始位置を表示",
  "row.showText": "この文字を表示",
  "row.arrow": "矢印",
  "row.arrowTip": "矢印で指し示します(A)。プレビュー上で先端をドラッグ。",
  "row.zoomAmount": "ズーム倍率",
  "row.speed": "速度",
  "row.text": "文字",
  "row.textStyle": "文字の見た目",
  "row.textSize": "文字の大きさ",
  "row.cutLen": "−{s}秒",
  "grip.zoom.start": "ドラッグしてズームの開始位置を変更",
  "grip.zoom.end": "ドラッグしてズームの終了位置を変更",
  "grip.cut.start": "ドラッグしてカットの開始位置を変更",
  "grip.cut.end": "ドラッグしてカットの終了位置を変更",
  "grip.speed.start": "ドラッグして早送りの開始位置を変更",
  "grip.speed.end": "ドラッグして早送りの終了位置を変更",
  "grip.text.start": "ドラッグして文字の表示開始を変更",
  "grip.text.end": "ドラッグして文字の表示終了を変更",
  "look.dark": "黒",
  "look.light": "白",
  "look.accent": "青",
  "result.line": "仕上がり: {len}({parts})",
  "result.cut": "カットで {len} 短縮",
  "result.saved": "早送りで {len} 短縮",
  "result.sep": "、",
  "resume.saved": "保存: {ago}",
  "sum.zoom": "ズーム{n}",
  "sum.zooms": "ズーム{n}",
  "sum.cut": "カット{n}",
  "sum.cuts": "カット{n}",
  "sum.speed": "早送り{n}",
  "sum.speeds": "早送り{n}",
  "sum.text": "文字{n}",
  "sum.texts": "文字{n}",
  "ago.now": "たった今",
  "ago.min": "{n}分前",
  "ago.h": "{n}時間前",
  "ago.days": "{n}日前",
  "left.few": "まもなく完了",
  "left.s": "残り約{n}秒",
  "left.min": "残り約{n}分",
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
  return KEYS.filter((k) => DICTS[lang][k] === undefined);
}

export function isKey(k: string): k is Key {
  return k in en;
}

/** Translate a key built at run time (e.g. `bg.${id}`), or use `fallback` when there is no such key. */
export function tOr(key: string, fallback: string): string {
  return isKey(key) ? t(key) : fallback;
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
