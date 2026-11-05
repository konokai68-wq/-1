# Panreel

**Turn raw screen recordings into polished demo videos — free, open source, and entirely in your browser.**

Panreel is a lightweight, browser-only alternative to paid screen-recording studios such as Screen Studio. Record your screen (or drop in an existing clip), put it on a clean backdrop with rounded corners and a soft shadow, add smooth zooms to the moments that matter, and export. No install, no account, no upload: your video never leaves your device.

![Panreel editor with a recording on a gradient backdrop and one zoom on the timeline](docs/screenshot.png)

## What it does today

- **Record** your screen, a window or a tab straight from the browser — or open / drag-and-drop a WebM or MP4 file
- **Style** the frame: six gradient backdrops, padding, corner radius and shadow
- **Canvas sizes** for every platform: 16:9, 1:1, 9:16 and 4:3
- **Smooth zooms**: press *Add zoom here*, click the preview to aim it, choose 1.4×–3×. Zooms ease in and out automatically
- **Export** to WebM (rendered in real time; keep the tab open)

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

See [docs/ROADMAP.md](docs/ROADMAP.md). Next up: trimming, MP4 export via WebCodecs, a draggable zoom timeline, and a webcam bubble.

## Privacy

Panreel is a static site. There is no backend, no analytics and no account. Recording, editing and encoding all happen locally with standard browser APIs.

## License

[MIT](LICENSE)
