# Work log

Newest first. One short entry per working session.

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
