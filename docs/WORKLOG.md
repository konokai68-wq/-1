# Work log

Newest first. One short entry per working session.

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
