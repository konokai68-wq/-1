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
- [ ] Faster export: render in a worker (OffscreenCanvas) — built as opt-in `?export=worker` (`exportWorker.ts`); keeps the page responsive but was ~2× slower in headless Chromium, so it needs a check on real GPUs before it becomes the default
- [x] Time left shown in export and auto-zoom progress (`eta.ts`)
- [x] GIF export for short clips (≤ 30 s, 480p, 15 fps; WebCodecs decode with a <video>-seeking fallback)
- [x] Save the frame under the playhead as a PNG at the export size (button and <kbd>P</kbd>; thumbnails) (`still.ts`)
- [x] Export resolution (720p / 1080p / 1440p / 4K) and frame-rate (30 / 60 fps) options
- [x] Undo / redo (zooms, trim, frame sliders); keyboard shortcuts with a `?` help sheet

## Phase 3 — Studio features
- [x] Webcam bubble (record camera alongside the screen or add a camera clip; circle / rounded, size, corner, mirror; drag on the preview)
- [x] Cut segments (X / *Cut here*, drag on the timeline; skipped in playback and all exports, audio retimed)
- [x] Speed-up segments (S / *Speed up*, 2× / 4× / 8×, drag on the timeline; muted, frames and GIF timing squeezed in all exports)
- [x] Text callouts (T / *Add text*, Dark / Light / Blue, S / M / L, drag on the preview, fade in / out; in all exports)
- [x] Arrow annotations (A / *Arrow* on a callout; drag the tip on the preview; outlined, fades with the callout; in all exports)
- [x] Auto zoom: scan the clip for local on-screen changes and add zooms aimed at them (`autoZoom.ts`, `autoZoomScan.ts`)
- [x] Window frame: optional plain title bar (light / dark) above the recording, saved with the project, in every export (`windowLayout` in `layout.ts`)
- [x] Blur boxes: pixelate or solid-fill parts of the screen for the whole clip or a time span (drag / resize on the preview; follow zooms; in every export, worker included) (`masks.ts`)
- [x] Spotlight: a box style that dims everything around it (drawn before hiding boxes, so hidden spots stay hidden; in every export) (`drawOrder` in `masks.ts`)
- [x] Look presets: save the backdrop / canvas size / padding / corners / shadow / window frame and apply them to the next clip in one click (up to 8, localStorage; image backdrops are not stored) (`looks.ts`)
- [x] Motion blur on zooms: each frame averages a few views over a short shutter while the camera moves (sharp when still; blur boxes cover every view; on by default, saved with the project) (`motionBlur.ts`)
- [x] Crop the recording: drag a box on the preview (*Draw on the preview*, whole video shown while drawing) or use the Left / Right / Top / Bottom sliders to keep part of the source; zooms, auto zoom and click-to-aim work inside the crop, blur boxes keep source coordinates; saved with the project, part of undo, in every export (`crop.ts`)
- [x] Click ripple on zooms: a ring grows and fades at each zoom's aim point once the camera arrives, so viewers see where the "click" landed (off by default, saved with the project, in every export) (`ripples.ts`)
- [x] Linked zooms: zooms less than 1 s apart glide straight from one aim point to the next (no zoom-out in between; motion blur and every export follow) (`zoomsLinked` / `cameraAt` in `layout.ts`)
- [ ] Optional cursor highlight when recording this browser tab
- [x] Save / load projects locally (IndexedDB autosave of the last project, *Resume last project* / *Discard* on the start screen)

## Phase 4 — Launch & growth
- [x] Demo GIF and fresh screenshot in README, made with Panreel itself (`scripts/make-demo.mjs`)
- [x] Hosted demo on GitHub Pages: https://konokai68-wq.github.io/panreel/ (repo renamed to `panreel`, Pages on)
- [x] Social preview image (`public/social-preview.png`, `scripts/make-social.mjs`) and Open Graph / Twitter tags built from the repo name
- [x] Landing section: *Try a sample clip* (a made-up screencast drawn and encoded in the browser, `sample.ts` / `sampleClip.ts`), short facts and a source link on the start screen
- [x] Translations (Japanese first): `i18n.ts` with an EN / 日本語 switch and `?lang=`; every screen, message, list row, the shortcut sheet and the resume summary
- [x] Launch posts drafted (Show HN, Reddit, X in English and Japanese; kept on the team's notes page — the owner posts them once the Pages demo is live)
- [ ] Launch posts published (owner)
