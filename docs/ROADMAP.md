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
- [ ] Trim start / end
- [ ] Drag zoom edges on the timeline to change their length
- [ ] Custom solid colour and image backdrops

## Phase 2 — Quality output
- [ ] Fast MP4 export with WebCodecs + an MP4 muxer (faster than real time)
- [ ] GIF export for short clips
- [ ] Export resolution and frame-rate options
- [ ] Undo / redo; keyboard shortcuts

## Phase 3 — Studio features
- [ ] Webcam bubble (record camera alongside the screen; shape, size, position)
- [ ] Cut / speed-up segments
- [ ] Text and arrow annotations
- [ ] Optional cursor highlight when recording this browser tab
- [ ] Save / load projects locally (IndexedDB)

## Phase 4 — Launch & growth
- [ ] Hosted demo on GitHub Pages, demo GIF in README
- [ ] Landing section, social preview image
- [ ] Translations (Japanese first)
- [ ] Launch posts drafted (owner posts them)
