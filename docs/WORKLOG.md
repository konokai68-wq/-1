# Work log

Newest first. One short entry per working session.

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
