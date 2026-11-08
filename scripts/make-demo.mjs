// Rebuilds the README media (docs/demo.gif, docs/screenshot.png) with Panreel itself.
//
//   npm run build && node scripts/make-demo.mjs
//
// Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).
// It draws a short, made-up "task list" screencast on a canvas, records it with
// MediaRecorder, opens it in the built app, adds a zoom, a speed-up and a text
// callout with an arrow through the normal UI, then exports a GIF.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

// CommonJS require so a globally installed Playwright (NODE_PATH) also works.
const { chromium } = createRequire(import.meta.url)("playwright");

const PORT = 4179;
const OUT = new URL("../docs/", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "panreel-demo-"));

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch();
try {
  const clip = await recordClip(browser);
  const clipPath = join(work, "clip.webm");
  writeFileSync(clipPath, clip);
  console.log(`clip: ${(clip.length / 1024).toFixed(0)} KB`);
  await editAndExport(browser, clipPath);
} finally {
  await browser.close();
  server.kill();
}

/** Draw and record a 9 s fake app screencast; returns the WebM bytes. */
async function recordClip(browser) {
  const page = await browser.newPage();
  const b64 = await page.evaluate(async () => {
    const W = 1440, H = 900, FPS = 30, LEN = 9;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const tasks = ["Write the release notes", "Fix the login redirect", "Update the pricing page"];
    const typed = "Record the product demo";
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const lerp = (a, b, k) => a + (b - a) * k;
    const font = (w, s) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    const btn = { x: 1110, y: 128, w: 210, h: 56 };

    function cursorAt(t) {
      const path = [
        [0, 700, 620], [1.2, btn.x + 120, btn.y + 30], [2.0, btn.x + 120, btn.y + 30],
        [5.0, 560, 470], [5.6, 413, 497], [6.6, 413, 497], [7.2, 413, 593], [9, 413, 593],
      ];
      for (let i = 1; i < path.length; i++) {
        const [t1, x1, y1] = path[i];
        const [t0, x0, y0] = path[i - 1];
        if (t <= t1) { const k = ease((t - t0) / (t1 - t0)); return [lerp(x0, x1, k), lerp(y0, y1, k)]; }
      }
      return path.at(-1).slice(1);
    }

    function frame(t) {
      g.fillStyle = "#f6f7fb";
      g.fillRect(0, 0, W, H);
      // Sidebar
      g.fillStyle = "#1f2233";
      g.fillRect(0, 0, 260, H);
      g.fillStyle = "#ffffff";
      g.font = font(700, 26);
      g.fillText("● Tasks", 36, 70);
      ["Inbox", "Today", "Upcoming", "Projects"].forEach((s, i) => {
        if (i === 1) { g.fillStyle = "#33384f"; rr(20, 118 + i * 52, 220, 42, 10); g.fill(); }
        g.fillStyle = i === 1 ? "#ffffff" : "#9aa0b8";
        g.font = font(500, 20);
        g.fillText(s, 40, 146 + i * 52);
      });
      // Header
      g.fillStyle = "#1f2233";
      g.font = font(700, 40);
      g.fillText("Today", 330, 170);
      g.fillStyle = "#7a8099";
      g.font = font(400, 20);
      g.fillText("Launch week · 4 tasks", 332, 206);
      // Button (pressed at 1.6 s)
      const press = t > 1.55 && t < 1.8 ? 0.94 : 1;
      g.save();
      g.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
      g.scale(press, press);
      g.fillStyle = t > 1.2 && t < 2.2 ? "#4b5be0" : "#5b6cf0";
      rr(-btn.w / 2, -btn.h / 2, btn.w, btn.h, 14);
      g.fill();
      g.fillStyle = "#fff";
      g.font = font(600, 21);
      g.textAlign = "center";
      g.fillText("+  New task", 0, 8);
      g.restore();
      g.textAlign = "left";
      // Rows
      const rows = [...tasks];
      const showNew = t > 1.7;
      if (showNew) rows.push(typed.slice(0, Math.max(0, Math.floor((t - 2.2) * 9))));
      rows.forEach((s, i) => {
        const y = 250 + i * 96;
        const appear = i === 3 ? ease((t - 1.7) / 0.3) : 1;
        g.globalAlpha = appear;
        g.fillStyle = "#ffffff";
        rr(330, y, 990, 80, 16);
        g.fill();
        g.strokeStyle = i === 3 ? "#5b6cf0" : "#e3e5ef";
        g.lineWidth = 2;
        g.stroke();
        const done = (i === 0 && t > 6.0) || (i === 1 && t > 7.4);
        g.fillStyle = done ? "#3fb27f" : "#ffffff";
        g.strokeStyle = done ? "#3fb27f" : "#c3c7d6";
        g.lineWidth = 3;
        rr(368, y + 24, 32, 32, 9);
        g.fill();
        g.stroke();
        if (done) {
          g.strokeStyle = "#fff";
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(376, y + 41);
          g.lineTo(382, y + 48);
          g.lineTo(394, y + 33);
          g.stroke();
        }
        g.fillStyle = done ? "#a2a7ba" : "#1f2233";
        g.font = font(500, 24);
        g.fillText(s, 430, y + 48);
        if (done) { g.fillRect(430, y + 39, g.measureText(s).width, 2); }
        if (i === 3 && t < 5.2 && Math.floor(t * 2) % 2 === 0) {
          g.fillStyle = "#5b6cf0";
          g.fillRect(432 + g.measureText(s).width, y + 24, 2, 30);
        }
        g.globalAlpha = 1;
      });
      // Cursor
      const [cx, cy] = cursorAt(t);
      const clicks = [1.6, 6.0, 7.4];
      for (const ct of clicks) {
        const k = (t - ct) / 0.45;
        if (k > 0 && k < 1) {
          g.strokeStyle = `rgba(91,108,240,${1 - k})`;
          g.lineWidth = 4;
          g.beginPath();
          g.arc(cx, cy, 10 + k * 30, 0, Math.PI * 2);
          g.stroke();
        }
      }
      g.save();
      g.translate(cx, cy);
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(8, 23); g.lineTo(14, 36); g.lineTo(19, 34); g.lineTo(13, 21); g.lineTo(23, 21);
      g.closePath();
      g.fillStyle = "#111";
      g.strokeStyle = "#fff";
      g.lineWidth = 2;
      g.fill();
      g.stroke();
      g.restore();
    }

    const stream = c.captureStream(FPS);
    const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 8e6 });
    const parts = [];
    rec.ondataavailable = (e) => parts.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    frame(0);
    rec.start();
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        const t = (performance.now() - t0) / 1000;
        frame(Math.min(t, LEN));
        if (t < LEN) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
    rec.stop();
    await done;
    const buf = new Uint8Array(await new Blob(parts).arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
  await page.close();
  return Buffer.from(b64, "base64");
}

async function editAndExport(browser, clipPath) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/`);
  await page.setInputFiles("#file", clipPath);
  await page.waitForFunction(() => !document.querySelector("#scrub").disabled);
  await page.waitForTimeout(800);

  const seek = async (t) => {
    await page.evaluate((t) => {
      const v = document.querySelector("#video");
      const s = document.querySelector("#scrub");
      s.value = String(Math.round((t / v.duration) * 1000));
      s.dispatchEvent(new Event("input"));
    }, t);
    await page.waitForTimeout(250);
  };
  const box = await page.locator("#canvas").boundingBox();
  const at = (fx, fy) => [box.x + fx * box.width, box.y + fy * box.height];
  const drag = async (from, to) => {
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...to, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  };
  const blur = () => page.evaluate(() => document.activeElement?.blur());

  // Backdrop: the third gradient.
  await page.locator("#swatches .swatch").nth(2).click();

  // Zoom on the new task while it is typed.
  await seek(1.75);
  await page.click("#addZoom");
  await page.waitForTimeout(200);
  await page.mouse.click(...at(0.46, 0.54));
  await page.waitForTimeout(200);

  // Speed up the end of the typing.
  await seek(3.6);
  await blur();
  await page.keyboard.press("s");

  // A callout with an arrow pointing at the ticked task.
  await seek(5.6);
  await blur();
  await page.keyboard.press("t");
  await page.waitForTimeout(200);
  const input = page.locator("#textList input").first();
  await input.fill("Tick off what's done");
  await blur();
  await page.keyboard.press("a");
  await page.waitForTimeout(300);
  await seek(6.4);
  await drag(at(0.5, 0.86), at(0.24, 0.83)); // the callout, to the lower left
  await drag(at(0.566, 0.59), at(0.33, 0.405)); // the arrow's tip, to the first task's tick
  await page.waitForTimeout(300);

  await seek(6.6);
  await page.mouse.move(box.x + box.width + 40, box.y + 10);
  await page.waitForTimeout(4000); // let the toast go away
  await page.screenshot({ path: join(OUT, "screenshot.png") });
  console.log("screenshot.png written");

  await page.locator("#format label", { hasText: "GIF" }).click();
  const download = page.waitForEvent("download", { timeout: 180_000 });
  await page.click("#export");
  const file = await download;
  await file.saveAs(join(OUT, "demo.gif"));
  console.log("demo.gif written");
  await context.close();
}
