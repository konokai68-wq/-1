# Work log

Newest first. One short entry per working session.

## 2026-11-13 18:00 JST — draw the crop on the preview
- *Crop → Draw on the preview*: the preview shows the whole video (no crop, no zoom) with the current crop outlined and the rest dimmed; drag a box around the part to keep and it becomes the crop (one undo step). <kbd>Esc</kbd> or *Cancel drawing* leaves it unchanged; a plain click keeps drawing; other preview drags and click-to-aim are off while drawing. `cropFromPoints` in `crop.ts` (pure, tested): any corner order, clamped to the video, thin boxes grow to the 10 % minimum. Edges may now cut up to 90 % (sliders too), so a small window in a corner can be kept. English / Japanese.
- Checked in headless Chromium (`en-US`, `ja-JP`): sample clip, drag around the share menu → crop left 56 % / bottom 50 %, preview shows only the menu; Esc cancels; Ctrl+Z / Ctrl+Shift+Z undo and redo it; no page errors. Tests: 221 passing.
- Next: cursor highlight, or measure the export worker on a real machine.

## 2026-11-13 13:00 JST — crop the recording
- New *Crop* box in the inspector: *Left* / *Right* / *Top* / *Bottom* sliders (up to 45 % each, at least 10 % of each axis kept) and *Show the whole video*. `crop.ts` (pure, tested): the layout fits the cropped view, zoom windows (and motion-blur views) are worked out inside it and moved to the crop's spot in the source; blur boxes stay in source coordinates, pixel blocks are sized on the cropped frame. Auto zoom suggestions are re-aimed inside the crop (ones aimed at a cut-off part are dropped); a new blur box lands in the middle of the crop. Saved with the project (older projects show the whole video), part of undo, every export (worker too); English / Japanese.
- Checked in headless Chromium (`en-US` page export, `ja-JP` with `?export=worker`): sample clip cropped left 40 % / bottom 45 % → preview, 1920 × 1080 PNG and 1080p60 MP4 (480 frames) show just the top-right with the share menu; undo / redo, reload → Resume keep the crop, reset clears it; no page errors. Tests: 216 passing.
- Next: drag the crop on the preview, cursor highlight, or measure the export worker on a real machine.

## 2026-11-13 09:00 JST — save a frame as PNG
- *Export → Save frame as PNG* (or <kbd>P</kbd>) draws the frame under the playhead at the export size with the same `drawFrame` as the video (backdrop, zoom, camera bubble, text, blur boxes; no preview outlines, no motion blur) and downloads it as `panreel-frame-0m02.0s.png` (`stillFileName` in `still.ts`, pure and tested). Added to the shortcut sheet; English / Japanese.
- Checked in headless Chromium (`en-US` button, `ja-JP` P key): sample clip at 2 s → 1920 × 1080 PNG with the open share menu, toast in each language; no page errors. Tests: 202 passing.
- Next: cursor highlight, or measure the export worker on a real machine.

## 2026-11-12 22:00 JST — motion blur on zooms
- *Frame → Motion blur on zooms* (on by default): while a zoom eases in or out, each frame averages up to 12 views of the picture over a 14 ms shutter, one per ~3 output pixels of movement, so zooms look like a smooth camera move instead of a slide. Still frames are drawn once, as before. `blurWindows` / `windowMovePx` in `motionBlur.ts` (pure, tested); `drawFrame` composites the views at 1/(k+1) alpha. Blur boxes cover the spot in every view, so a smeared copy of hidden text never shows. Saved with the project (older projects get it on); English / Japanese.
- Checked in headless Chromium (sample clip + Auto zoom): preview edge energy during ramps drops to 0.28–0.76 of the sharp frame, identical when still; 1080p60 MP4 (480 frames) blurred in page export (`en-US`) and `?export=worker`, sharp with it off (`ja-JP`, worker); reload → Resume keeps the setting; no page errors. Tests: 199 passing.
- Next: cursor highlight, or measure the export worker on a real machine.

## 2026-11-12 18:00 JST — look presets
- New *Looks* box at the top of the inspector: *Save this look* keeps the backdrop (gradient or colour), canvas size, padding, corners, shadow and window bar in localStorage (`panreel.looks`, up to 8, named "Look 1", "Look 2"…); a click on a saved look applies it — before a clip is open too, so it styles the next one. The look that matches the current style is outlined; saving an identical look says which one it is. `looks.ts` (pure, tested: sanitize, compare, name, add / remove, chip colour). Applying is one undo step for the frame sliders. English / Japanese.
- Checked in headless Chromium (`en-US`, `ja-JP`): save → duplicate message → reload → apply → load the sample clip keeps the look; edit, re-apply, Ctrl+Z; remove; no page errors. Tests: 192 passing.
- Next: cursor highlight, or measure the export worker on a real machine.

## 2026-11-12 13:00 JST — spotlight
- Blur boxes get a third style, *Spotlight* / 「スポットライト」: the recording around the box dims (55 %) and the box stays lit with soft corners. Several spotlights light up together; spotlights are drawn first (`drawOrder` in `masks.ts`, tested), so a Pixelate / Solid box inside one still hides. Works with *Part of the clip*, saved with the project, part of undo.
- Checked in headless Chromium (`en-US` page export, `ja-JP` with `?export=worker`): sample clip, one spotlight + one solid box → preview lit inside (761) vs dimmed outside (69), 1080p60 MP4 (480 frames) shows both and no outlines; undo / redo switch the style; no page errors. Tests: 185 passing.
- Next: look presets, or cursor highlight.

## 2026-11-12 09:00 JST — blur boxes for part of the clip
- Each blur box row has *Whole clip / Part of the clip*; *Part* starts a 3 s span at the playhead, and *From* / *To* move either end to the playhead (`timeMask`, `setMaskEdge`, `maskShown` in `masks.ts`, pure and tested). Off boxes show faintly in the preview and stay draggable. Saved with the project; a broken span falls back to the whole clip (hiding more, never less). Part of undo; English / Japanese labels.
- Fix: the blur box row was wider than the inspector and pushed it sideways; it now wraps.
- Checked in headless Chromium (`en-US` page export, `ja-JP` with `?export=worker`): sample clip, solid box shown 1–4 s → preview and 1080p60 MP4 (480 frames) show it at 2 s / 3.9 s and not at 0.5 s / 5 s; undo / redo, reload → Resume keep the span; no page errors. Tests: 184 passing.
- The owner renamed the repo to `panreel` and Pages deploys succeed: default repo links now point to `konokai68-wq/panreel`, README links the hosted app.
- Next: cursor highlight.

## 2026-11-11 22:00 JST — blur boxes
- *Blur → Add blur box* hides emails, names or keys for the whole clip: drag the box on the preview, drag its bottom-right handle to resize, pick *Pixelate* or *Solid*. Boxes live in source-video coordinates (`masks.ts`, pure and tested), so they stick to the same spot through zooms; pixel blocks are sized on the unzoomed frame so zooming never reveals more detail.
- Drawn inside `drawFrame` (every export, the worker too); the dashed outline and handle are preview-only. Saved with the project (older projects get none), part of undo, English / Japanese labels, counted in the resume summary.
- Checked in headless Chromium (`en-US` page export, `ja-JP` with `?export=worker`): sample clip, two boxes, drag, Solid, undo / redo, 1080p60 MP4 (480 frames) shows both boxes and no outlines, reload → Resume keeps them; no page errors. Tests: 181 passing.
- Next: cursor highlight, or time ranges for blur boxes.

## 2026-11-11 18:00 JST — window frame
- *Frame → Window: None / Light / Dark* draws a plain title bar (three neutral dots, empty address field) above the recording. `windowLayout` (pure, tested) fits bar + recording inside the padding with one rounded outline; zooms only move inside the recording, click-to-aim maps through the content rect.
- Saved with the project (`chrome`, older projects default to none); in every export because it is part of `drawFrame`. English / Japanese labels.
- Checked in headless Chromium (`en-US`, `ja-JP`): sample clip with a dark bar in the preview and a 1080p60 MP4 (480 frames), reload → Resume keeps it; no page errors. Tests: 171 passing.
- Next: cursor highlight, or measure the export worker on a real machine.

## 2026-11-11 13:00 JST — export in a worker (opt-in)
- `exportWorker.ts` runs the WebCodecs export in a module worker on an OffscreenCanvas with the same renderer (`Ctx2D` type in `render.ts`; `fastExport.ts` makes an OffscreenCanvas when there is no `document`). Image backdrops go over as a transferred ImageBitmap; the camera bubble decodes inside the worker. `workerExport.ts` (tested with a fake worker) relays progress / cancel and falls back to the page on any failure.
- Measured in headless Chromium (2 CPUs, sample clip, 1080p60 MP4, image backdrop, auto zooms, a callout): page 27 s, worker 53 s; longest UI frame gap 133 ms vs 67 ms. A micro-benchmark shows drawing on an OffscreenCanvas in a worker is ~2× slower there (software raster), so the worker is opt-in with `?export=worker` until it is measured on real GPUs. Both outputs: 480 frames, identical frames. Tests: 166 passing.
- Next: cursor highlight, or measure the worker on a real machine.

## 2026-11-10 09:00 JST — time left, launch drafts
- Export (MP4 / WebM / GIF / real-time) and auto-zoom toasts add "about 20 s left" once 3 % and 1.5 s are done (`eta.ts`, pure and tested: average rate, 5 s steps under a minute, whole minutes above; English and Japanese).
- Fix: in Japanese a failed GIF export showed "Export cancelled" instead of the error (the check compared the toast with English text); now a flag.
- Launch posts drafted (Show HN, Reddit, X in English / Japanese) on the team's notes page; the owner posts them after enabling Pages.
- Checked in headless Chromium (`en-US`, `ja-JP`): sample clip at 4K60 took 61 s / 78 s; the toast said "about 1 min left" / 「残り約1分」 from 3 %; no page errors. Tests: 161 passing.
- Next: faster export in a worker.

## 2026-11-09 22:00 JST — start screen: sample clip
- *Try a sample clip* on the start screen: `sample.ts` (scene timing pure and tested) draws an 8 s made-up notes app with a menu that opens and text being typed; `sampleClip.ts` (lazy) encodes it with Mediabunny `CanvasSource` in about 2 s, only in a codec the browser can also play, else records the canvas in real time. The toast points to *Auto zoom*.
- Start screen also lists three facts (stays on your device, free and MIT, no install) and a source link; the link follows `GITHUB_REPOSITORY` at build time (`repoUrl`). On phones only the title and the sample button show.
- Fix: MP4s and other files with a known length showed a black preview until the first seek; `loadVideo` now always seeks to 0.
- Checked in headless Chromium (`en-US` 1440 px, `ja-JP` 390 px): sample loads (8.0 s), Auto zoom adds 1.8× on the menu (0–5 s) and 2.4× on the typing (5–8 s); no page errors. Tests: 156 passing.
- Next: faster export in a worker, or cursor highlight.

## 2026-11-09 18:00 JST — Japanese UI, part 3 (done)
- The rows of the zoom / cut / speed-up / text lists (Remove, tooltips, aria labels, text looks, "−1.0 s"), the timeline grip tooltips and the cut / speed-up result line use `t()` and rebuild when the language changes.
- `editSummary` and `timeAgo` (resume box) take a language; the resume line switches live too.
- Checked in headless Chromium (`ja-JP`): zoom, cut, speed-up and text rows plus the result line in Japanese, English after the switch; after a reload the resume line switches both ways; no page errors. Tests: 149 passing.
- Next: faster export in a worker, cursor highlight, or a landing section.

## 2026-11-09 13:00 JST — Japanese UI, part 2
- All toasts and load / record errors use `t()` (about 60 messages, `msg.*`). The shortcut sheet, backdrop names, canvas sizes, export format, bubble shapes and corners get keys through `tOr()` + `data-i18n*`, so they switch live.
- Tests: run-time keys (`sc.*`, `bg.*`, `aspect.*`, `format.*`) exist and match the English text; every translation keeps the `{slot}`s of the English one. 148 passing.
- Checked in headless Chromium (`ja-JP`): shortcut sheet, select options, swatch titles and a drop-hint toast in Japanese, then English after the switch; no page errors.
- Next: the rows of the zoom / cut / speed-up / text lists and the resume summary.

## 2026-11-09 09:00 JST — Japanese UI, part 1
- `i18n.ts` (pure parts tested): English / Japanese dictionaries with English fallback and `{slot}` filling; language from `?lang=`, then the saved choice (`localStorage`), then the browser language. A quiet *English / 日本語* button in the top bar switches live, without a reload.
- The fixed markup opts in with `data-i18n`, `data-i18n-html`, `data-i18n-title` and `data-i18n-aria`; the record / export / auto-zoom buttons, play label and export info use `t()`. Lists, toasts and the shortcut sheet are still English (next session).
- Fix: on phones the timeline sat on top of the inspector because the page was locked to the viewport height; below 760 px the page now scrolls.
- Checked in headless Chromium with `ja-JP` and `en-US` locales at 1440 and 390 px; switch and reload keep the choice. Tests: 145 passing.

## 2026-11-08 22:00 JST — auto zoom
- *Auto zoom* (Zooms panel): samples the trimmed clip at 4 fps as 160 px greyscale frames, measures what changed between neighbours (`autoZoom.ts`, pure and tested) and turns local changes into zooms: aimed at the changed area, 2.4× / 1.8× / 1.4× by its size, from 0.5 s before to 1.6 s after, 2–8 s long. Page changes and scrolls (over 22 % of pixels) are ignored; a popup that opens and closes in the same spot is one zoom; never overlaps existing zooms; one undo step; cancellable.
- Frame pulling moved from `gifExport.ts` to a shared `frameSource.ts` (WebCodecs, with `<video>` seeking as the fallback).
- Checked in headless Chromium: 9 s clip with a popup at 2–3.5 s, a page change at 5 s and typing from 6.5 s → 2 zooms (1.5–5.1 s on the popup, 6–8 s on the typing) in about 3 s; Ctrl+Z removes both. Tests: 136 passing.
- Next: faster export in a worker, or a Japanese UI.

## 2026-11-08 18:00 JST — social preview card
- `public/social-preview.png` (1280×640, 466 KB): wordmark, headline, the four timeline-lane colours as a feature list, and the README screenshot; rebuilt by `scripts/make-social.mjs` (Playwright).
- Open Graph / Twitter tags: `siteMeta.ts` (pure, tested) + a Vite `transformIndexHtml` hook. In Actions, `GITHUB_REPOSITORY` gives the absolute Pages URL for `og:image` / `og:url`, so a repo rename needs no code change; local builds get title / description only.
- Checked: build with `GITHUB_REPOSITORY=konokai68-wq/-1` puts `https://konokai68-wq.github.io/-1/social-preview.png` in `dist/index.html`; the PNG is copied to `dist/`. Tests: 118 passing.
- Next: faster export in a worker, or cursor highlight.

## 2026-11-08 13:00 JST — demo GIF made with Panreel
- `scripts/make-demo.mjs` (Playwright): draws a 9 s made-up task-list screencast on a canvas, records it, opens it in the built app and, through the normal UI, adds a backdrop, a zoom, a 4× speed-up and a callout with an arrow, then exports `docs/demo.gif` (854×480, 7.5 s, 3.6 MB) and a new `docs/screenshot.png`. Both are in the README.
- Fix: a text callout's row (time, style, size, Arrow, Remove) was wider than the inspector and pushed the whole panel sideways when its text box was focused; the row now wraps.
- Checked: GIF frames at 0.5 / 2 / 2.6 / 6.5 s show the zoom easing in on the new task, the speed-up and the arrow. Tests: 113 passing.
- Next: social preview image, then faster export in a worker or cursor highlight.

## 2026-11-08 09:00 JST — autosave and resume
- The last project is autosaved to IndexedDB (`projectStore.ts`: a small "meta" JSON every 1.5 s when it changed, the video / camera / backdrop Blobs only when they change). The start screen offers *Resume last project* (name, length, edits, "saved 5 min ago") or *Discard*.
- `project.ts` (pure, tested): `sanitizeProject` clamps every span into the clip, drops broken entries and falls back to defaults, so a stale or damaged save never breaks the editor; `editSummary`, `timeAgo`.
- Checked in headless Chromium: open clip → zoom + text + cut, 1:1, padding 0.2, Moss → reload → resume restores all of it; Discard clears it. Tests: 113 passing.
- Next: cursor highlight, or faster export in a worker.

## 2026-11-07 22:00 JST — arrow annotations
- Callouts can carry an arrow (`TextNote.arrow` tip; `toggleArrow` / `defaultArrowTip` / `arrowGeometry` / `arrowTipHit` in `texts.ts`, pure and tested). *Arrow* in each text row or <kbd>A</kbd> toggles it (A adds a "Look here" callout when none is at the playhead); drag the tip on the preview; empty text gives a bare arrow. Undo / redo covers it.
- Drawn by `drawArrow` in `render.ts`: shaft from the pill's edge, solid head, outline in the look's ink colour, same fade as the pill — so every export gets it.
- Checked in headless Chromium: A at 1 s → arrow shown, tip dragged → preview follows, undo restores; 1080p MP4 shows the arrow at 2 s and nothing at 4.5 s. Tests: 105 passing.
- Next: save / load projects (IndexedDB), or cursor highlight.

## 2026-11-07 18:00 JST — text callouts
- Added text callouts (`texts.ts`: add / wrap / layout / hit-test, pure and tested): *Add text* / T puts a 3 s caption at the playhead and focuses its text box; Dark / Light / Blue looks, S / M / L sizes; drag it on the preview to move it; a violet fourth timeline lane with drag grips; Delete and undo / redo cover it.
- Drawn by `drawTexts` in `render.ts` above the camera bubble (rounded pill, 0.25 s fade and rise), so the preview, WebCodecs, GIF and real-time exports all get it.
- Checked in headless Chromium: 6 s clip, text at 0–3 s dragged to the top → preview pixels follow the drag, undo puts it back; 720p/30 fps MP4 shows the pill at 1.5 s, fading at 0.05 s / 2.9 s, gone at 4 s. Tests: 99 passing.
- Next: arrow annotations, or save / load projects (IndexedDB).

## 2026-11-07 13:00 JST — speed-up segments
- Added speed-ups (`cuts.ts`: `SpeedSpan`, `pieces`, and the time maps now take speeds): *Speed up* / S adds 2 s at 4× at the playhead; 2× / 4× / 8× per segment in a new Speed-ups panel; teal bars on a third timeline lane with drag grips; Delete and undo / redo cover them.
- Preview sets `playbackRate` (muted) inside speed-ups; the real-time fallback follows. WebCodecs export retimes frames onto the frame grid (`frameSlotter`, extra frames dropped) and turns sped-up audio into silence of the squeezed length; GIF frames are planned on the output timeline.
- Checked in headless Chromium: 8 s colour-per-second clip, 2–4 s at 4× and 4–6 s at 2× → WebM+Opus 5.52 s, MP4 5.50 s (330 frames at 60 fps), GIF 5.53 s; colours at 1.5 / 2.3 / 3.2 / 4.0 / 5.0 s match the mapped source times; audio −21 dB outside, −90 dB inside the speed-ups. Tests: 87 passing.
- Next: text and arrow annotations, or save / load projects (IndexedDB).

## 2026-11-07 09:00 JST — cut segments
- Added cuts (`cuts.ts`): *Cut here* / X drops 1 s at the playhead; drag the red bar's ends on a new timeline lane; listed in a Cuts panel with the resulting length; Delete removes the cut (or zoom) at the playhead; part of undo / redo.
- Playback jumps over cuts. WebCodecs export drops cut frames and retimes the rest in Mediabunny's `process` hooks (audio samples too, never overlapping); GIF frames are planned on the output timeline; the real-time fallback relies on the playback skip.
- Checked in headless Chromium: 6 s clip, cuts 2–3 s and 4–4.5 s → MP4 4.50 s, WebM 4.52 s (audio 4.51 s), GIF 4.53 s, colours on both sides of each cut match the source. Tests: 80 passing.
- Next: speed-up segments, or faster export in a worker.

## 2026-11-06 22:00 JST — webcam bubble
- Added a Camera section: record the webcam with the screen (second MediaRecorder started together) or add an existing camera clip. The bubble is drawn at render time (`camera.ts`, `drawBubble`), so shape (circle / rounded), size, corner, mirror and visibility stay editable; drag it on the preview to snap to another corner.
- Exports pull camera frames in time order (`cameraFrames.ts`: Mediabunny CanvasSink, or seeking a hidden <video>); the real-time fallback plays the camera <video> in sync.
- Checked in headless Chromium with fake devices: record screen + camera → bubble shown; added clip → MP4 (720p) and GIF both show the bubble in step (timestamp overlay matches at 2 s). Tests: 66 passing.
- Next: cut / speed-up segments, or faster export in a worker.

## 2026-11-06 18:00 JST — undo / redo and keyboard shortcuts
- Added undo / redo (toolbar buttons, Ctrl/⌘ Z, Ctrl/⌘ Shift Z or Ctrl Y) for zooms, trim and the frame sliders; a slider drag merges into one step (`history.ts`). Backdrop and export settings are not part of history yet.
- New keys (`shortcuts.ts`): Z add zoom, Delete remove zoom at playhead, ← / → step 0.1 s (Shift 1 s), Home / End to clip edges, ? opens a shortcuts sheet (`<dialog>`).
- Checked in headless Chromium with Playwright (add → trim → undo ×2 → redo → delete → undo, slider merge, dialog open/close; no page errors). Tests: 59 passing.
- Next: Phase 3 — webcam bubble, or faster export in a worker.

## 2026-11-06 13:00 JST — GIF export
- Added a Video / GIF format switch in the Export section. GIFs are 480p (shorter side), 15 fps with alternating 60/70 ms delays so the length stays exact, capped at 30 s; frames come from WebCodecs (Mediabunny CanvasSink) or, without it, by seeking a hidden <video>. Encoded with gifenc (MIT), lazy-loaded (~5 kB gzip).
- Checked in headless Chromium: 4 s clip with a zoom → 854×480 GIF, 60 frames, 4.0 s, zoom rendered; same result with WebCodecs disabled. Tests: 50 passing.
- Next: undo / redo and keyboard shortcuts.

## 2026-11-06 09:00 JST — export resolution and frame rate
- Added an Export section: 720p / 1080p / 1440p / 4K (by the canvas's shorter side, even dimensions) and 30 / 60 fps, remembered in localStorage. Used by both the WebCodecs path and the real-time fallback.
- Checked in headless Chromium: 720p/30 fps → H.264 MP4 1280×720, 30 fps, 3.0 s; settings survive reload. Tests: 44 passing.
- Next: GIF export for short clips, then undo / redo.

## 2026-11-05 22:00 JST — WebCodecs export (MP4)
- Export now decodes, styles and re-encodes every frame with WebCodecs via Mediabunny (lazy-loaded chunk): MP4/H.264 when possible, WebM/VP9+Opus when the browser can't encode AAC, real-time WebM as the last fallback.
- Checked in headless Chromium: silent clip → H.264 MP4 (4.0 s), trimmed clip with sound → VP9+Opus WebM (5.0 s of 1–6 s), zoom rendered. Tests: 37 passing.
- In this 2-CPU sandbox (software encoder) a 1080p60 export runs ~3× slower than real time; hardware encoders on real machines should be much faster. Next: 30 fps / resolution options, GIF export.

## 2026-11-05 18:00 JST — custom backdrops (Phase 1 complete)
- Added a solid colour picker and image backdrops (pick a file or drop an image on the canvas); images cover the canvas and can be blurred where `ctx.filter` is supported.
- Tests: 31 passing (new `coverRect` cases); checked colour, image, blur and switching back in Chromium with Playwright.
- Next: Phase 2 — fast MP4 export via WebCodecs + an MP4 muxer.

## 2026-11-05 13:00 JST — trim and resizable zooms
- Added trim start/end (inspector buttons, I / O keys, hatched timeline shading); playback and export respect the trim.
- Zoom bars on the timeline now have drag grips to change their length (no overlap, 0.5 s minimum).
- Moved the toast to the top so it no longer blocks the timeline. Tests: 28 passing; checked in Chromium with Playwright (trimmed export ≈ 6.6 s of 6.7 s).
- Next: custom solid colour / image backdrops, then fast MP4 export via WebCodecs.

## 2026-11-05 09:00 JST — target chosen, MVP running
- Chose the target: browser-only alternative to Screen Studio. Product name: Panreel.
- Built the first working editor: record/open video, gradient backdrop, padding/corners/shadow, aspect presets, eased manual zooms, real-time WebM export.
- Added Vitest unit tests (layout, camera, zoom list), CI and GitHub Pages deploy workflows, README, MIT license, roadmap.
- Next: trim, draggable zoom timeline, then fast MP4 export via WebCodecs.

## 2026-11-05 — setup
- Company founded. Direction: free, open-source, browser-only alternative to a paid tool.
- Next: planning team picks the target tool and drafts docs/ROADMAP.md.
