# Roadmap — Panreel

Browser-only, open-source alternative to paid screen-recording studios (e.g. Screen Studio).
Everything runs locally; no server, no account.

## Phase 1 — Usable MVP
- [x] Project setup: Vite + TypeScript + Vitest, GitHub Pages workflow
- [x] Record screen / window / tab (getDisplayMedia + MediaRecorder)
- [x] Open or drop a video file
- [x] Styled frame: gradient backdrops, padding, corner radius, shadow
- [x] Canvas sizes: 16:9, 1:1, 9:16, 4:3
- [x] Manual zooms with eased in/out, click-to-aim, zoom amount
- [x] Real-time WebM export
- [x] Trim start / end (buttons and I / O keys)
- [x] Drag zoom edges on the timeline to change their length
- [x] Custom solid colour and image backdrops (with optional blur)

## Phase 2 — Quality output
- [x] WebCodecs export: MP4/H.264 (WebM/VP9 fallback that keeps audio), frame-accurate, no real-time playback
- [x] 30 fps export option
- [ ] Faster export: render in a worker (OffscreenCanvas)
- [x] GIF export for short clips (≤ 30 s, 480p, 15 fps; WebCodecs decode with a <video>-seeking fallback)
- [x] Export resolution (720p / 1080p / 1440p / 4K) and frame-rate (30 / 60 fps) options
- [x] Undo / redo (zooms, trim, frame sliders); keyboard shortcuts with a `?` help sheet

## Phase 3 — Studio features
- [x] Webcam bubble (record camera alongside the screen or add a camera clip; circle / rounded, size, corner, mirror; drag on the preview)
- [x] Cut segments (X / *Cut here*, drag on the timeline; skipped in playback and all exports, audio retimed)
- [x] Speed-up segments (S / *Speed up*, 2× / 4× / 8×, drag on the timeline; muted, frames and GIF timing squeezed in all exports)
- [x] Text callouts (T / *Add text*, Dark / Light / Blue, S / M / L, drag on the preview, fade in / out; in all exports)
- [x] Arrow annotations (A / *Arrow* on a callout; drag the tip on the preview; outlined, fades with the callout; in all exports)
- [ ] Optional cursor highlight when recording this browser tab
- [ ] Save / load projects locally (IndexedDB)

## Phase 4 — Launch & growth
- [ ] Hosted demo on GitHub Pages, demo GIF in README
- [ ] Landing section, social preview image
- [ ] Translations (Japanese first)
- [ ] Launch posts drafted (owner posts them)
