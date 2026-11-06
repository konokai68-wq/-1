# Work log

Newest first. One short entry per working session.

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
