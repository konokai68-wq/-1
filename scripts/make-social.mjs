// Rebuilds public/social-preview.png (1280×640), the link-preview card for the
// hosted site and the repository's social preview.
//
//   node scripts/make-social.mjs
//
// Needs Playwright with Chromium. It lays out an HTML card around
// docs/screenshot.png (rebuild that first with scripts/make-demo.mjs if the UI changed).
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");

const root = new URL("../", import.meta.url).pathname;
const shot = readFileSync(root + "docs/screenshot.png").toString("base64");
const out = root + "public/social-preview.png";
mkdirSync(root + "public", { recursive: true });

const lanes = [
  ["#f2a33a", "Smooth zooms"],
  ["#e5484d", "Cuts"],
  ["#1fa595", "Speed-ups"],
  ["#8b5cf6", "Callouts & arrows"],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1280px; height: 640px; overflow: hidden; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e8ecf2;
    background:
      radial-gradient(circle at 1px 1px, #2b3440 1.2px, transparent 1.6px) 0 0 / 22px 22px,
      radial-gradient(120% 90% at 85% 15%, #23315f 0%, #151b26 55%, #11161f 100%);
    position: relative;
  }
  .copy { position: absolute; left: 72px; top: 76px; width: 470px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .mark { width: 44px; height: 34px; border-radius: 9px; background: #3150e8; position: relative; }
  .mark::after { content: ""; position: absolute; inset: 8px 10px; border-radius: 3px; background: #fff; }
  .name { font-size: 40px; font-weight: 750; letter-spacing: -0.02em; }
  h1 { margin-top: 44px; font-size: 50px; line-height: 1.06; font-weight: 760; letter-spacing: -0.03em; color: #fff; }
  h1 em { font-style: normal; color: #8fa2ff; }
  .lanes { margin-top: 34px; display: grid; gap: 12px; }
  .lane { display: flex; align-items: center; gap: 14px; font-size: 22px; color: #c9d1dd; }
  .lane span { width: 66px; flex: none; }
  .lane i { display: block; height: 12px; border-radius: 6px; }
  .foot { position: absolute; left: 72px; bottom: 60px; font-size: 19px; color: #9aa5b5; letter-spacing: 0.01em; }
  .foot b { color: #e8ecf2; font-weight: 600; }
  .shot {
    position: absolute; left: 600px; top: 70px; width: 800px; height: 510px;
    border-radius: 18px; overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08);
    background: url(data:image/png;base64,${shot}) left top / 1000px auto no-repeat;
  }
</style></head><body>
  <div class="copy">
    <div class="brand"><span class="mark"></span><span class="name">Panreel</span></div>
    <h1>Polish screen recordings <em>in your browser.</em></h1>
    <div class="lanes">
      ${lanes.map(([c, t], i) => `<div class="lane"><span><i style="background:${c};width:${[54, 30, 42, 66][i]}px"></i></span>${t}</div>`).join("")}
    </div>
  </div>
  <p class="foot"><b>Free &amp; open source</b> · No install · Nothing is uploaded</p>
  <div class="shot" role="img" aria-label="Panreel editor"></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.screenshot({ path: out });
} finally {
  await browser.close();
}
console.log(`${out}: ${(statSync(out).size / 1024).toFixed(0)} KB`);
