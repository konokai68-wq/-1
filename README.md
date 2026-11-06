# Panreel

**Turn raw screen recordings into polished demo videos — free, open source, and entirely in your browser.**

Panreel is a lightweight, browser-only alternative to paid screen-recording studios such as Screen Studio. Record your screen (or drop in an existing clip), put it on a clean backdrop with rounded corners and a soft shadow, add smooth zooms to the moments that matter, and export. No install, no account, no upload: your video never leaves your device.

![Panreel editor with a recording on a gradient backdrop and one zoom on the timeline](docs/screenshot.png)

## What it does today

- **Record** your screen, a window or a tab straight from the browser — or open / drag-and-drop a WebM or MP4 file
- **Style** the frame: six gradient backdrops, any solid colour, or your own image (with optional blur), plus padding, corner radius and shadow
- **Canvas sizes** for every platform: 16:9, 1:1, 9:16 and 4:3
- **Smooth zooms**: press *Add zoom here*, click the preview to aim it, choose 1.4×–3×. Zooms ease in and out automatically
- **Trim** the start and end — set them to the playhead with a button or the <kbd>I</kbd> / <kbd>O</kbd> keys
- **Resize zooms** by dragging the ends of their bars on the timeline
- **Export** to MP4 (H.264) or WebM with WebCodecs: every frame is decoded, styled and re-encoded directly, so the result is frame-accurate and you don't have to watch it play. MP4 is used when your browser can encode H.264 (and AAC for the soundtrack); otherwise Panreel picks WebM so the audio is never dropped. Browsers without WebCodecs fall back to real-time WebM recording
- **GIF export** for short clips (up to 30 s): 480p, 15 fps, loops forever — ready to drop into a README, pull request or chat
- **Export settings**: pick 720p, 1080p, 1440p or 4K and 30 or 60 fps (30 fps exports about twice as fast). Your choice is remembered in this browser
- **Webcam bubble**: tick *Record my camera with the screen* to record your face alongside, or add an existing camera clip to any video. Choose a circle or rounded square, size, corner (or drag it on the preview) and mirroring — it's kept separate until export, so you can restyle it any time
- **Undo / redo** for zooms, trim and frame settings (<kbd>Ctrl/⌘ Z</kbd>, <kbd>Ctrl/⌘ Shift Z</kbd>)

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Play / pause |
| <kbd>←</kbd> <kbd>→</kbd> | Step 0.1 s (hold <kbd>Shift</kbd> for 1 s) |
| <kbd>Home</kbd> <kbd>End</kbd> | Jump to the clip start / end |
| <kbd>I</kbd> <kbd>O</kbd> | Set the clip start / end to the playhead |
| <kbd>Z</kbd> | Add a zoom at the playhead |
| <kbd>Delete</kbd> | Remove the zoom at the playhead |
| <kbd>Ctrl/⌘ Z</kbd> · <kbd>Ctrl/⌘ Shift Z</kbd> | Undo · Redo |
| <kbd>?</kbd> | Show all shortcuts |

## Use it

The hosted version will live on GitHub Pages once it is enabled. To run it locally:

```bash
npm install
npm run dev
```

Then open the printed URL in Chrome, Edge or Firefox on a desktop computer.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (Vitest) |
| `npm run build` | Type-check and build the static site into `dist/` |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Next up: cut / speed-up segments, text and arrow annotations, and saving projects locally.

## Credits

Encoding and muxing use [Mediabunny](https://github.com/Vanilagy/mediabunny) (MPL-2.0); GIFs are written with [gifenc](https://github.com/mattdesl/gifenc) (MIT).

## Privacy

Panreel is a static site. There is no backend, no analytics and no account. Recording, editing and encoding all happen locally with standard browser APIs.

## License

[MIT](LICENSE)
