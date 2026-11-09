// A made-up 8 s "notes app" screencast, drawn on a canvas, so a visitor with no
// recording at hand can try the editor in one click. The scene has the two kinds
// of local change Auto zoom looks for: a menu that opens and closes (top right)
// and text being typed (bottom left).

export const SAMPLE_WIDTH = 1280;
export const SAMPLE_HEIGHT = 720;
export const SAMPLE_FPS = 30;
export const SAMPLE_SECONDS = 8;

/** The share menu is open during [open, close). */
export const MENU = { open: 1.4, close: 3.4, x: 960, y: 118, w: 260, h: 176 } as const;
export const SHARE_BUTTON = { x: 1100, y: 52, w: 120, h: 44 } as const;
/** Typing starts at `start` and adds one character every `step` seconds. */
export const TYPING = { start: 4.6, step: 0.08, text: "Ship the sample clip on Friday", x: 330, y: 560 } as const;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function menuOpen(t: number): boolean {
  return t >= MENU.open && t < MENU.close;
}

/** The part of the note typed so far at time t. */
export function typedAt(t: number): string {
  if (t < TYPING.start) return "";
  const n = Math.floor((t - TYPING.start) / TYPING.step) + 1;
  return TYPING.text.slice(0, Math.max(0, n));
}

// The pointer stays near the menu: Auto zoom reads any on-screen change, and a
// pointer sweeping across the whole screen would merge the two moments into one.
const CURSOR_PATH: readonly (readonly [number, number, number])[] = [
  [0, 1110, 210],
  [1.1, SHARE_BUTTON.x + 60, SHARE_BUTTON.y + 24],
  [1.6, SHARE_BUTTON.x + 60, SHARE_BUTTON.y + 24],
  [2.3, MENU.x + 110, MENU.y + 92],
  [SAMPLE_SECONDS, MENU.x + 110, MENU.y + 92],
];

/** Mouse pointer position at time t (eased between key points). */
export function cursorAt(t: number): [number, number] {
  for (let i = 1; i < CURSOR_PATH.length; i++) {
    const [t1, x1, y1] = CURSOR_PATH[i];
    const [t0, x0, y0] = CURSOR_PATH[i - 1];
    if (t <= t1) {
      const k = t1 === t0 ? 1 : ease((t - t0) / (t1 - t0));
      return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
    }
  }
  const last = CURSOR_PATH[CURSOR_PATH.length - 1];
  return [last[1], last[2]];
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;

function box(g: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  g.fillStyle = fill;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

const NOTES = [
  ["Launch checklist", "Docs, changelog, demo video"],
  ["Customer call notes", "Asked for keyboard shortcuts"],
  ["Weekly plan", "Polish exports, fix the timeline"],
];

/** Draw the scene at time t (seconds) on a SAMPLE_WIDTH × SAMPLE_HEIGHT canvas. */
export function drawSample(g: Ctx, t: number): void {
  const W = SAMPLE_WIDTH;
  const H = SAMPLE_HEIGHT;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#f7f6f2";
  g.fillRect(0, 0, W, H);

  // Sidebar
  g.fillStyle = "#24302b";
  g.fillRect(0, 0, 240, H);
  g.fillStyle = "#e9f1ec";
  g.font = font(700, 24);
  g.fillText("Notes", 32, 62);
  ["All notes", "Pinned", "Shared", "Archive"].forEach((s, i) => {
    if (i === 0) box(g, 16, 96, 208, 40, 9, "#35443d");
    g.fillStyle = i === 0 ? "#ffffff" : "#9fb3a9";
    g.font = font(500, 18);
    g.fillText(s, 34, 123 + i * 50);
  });

  // Header
  g.fillStyle = "#1d2420";
  g.font = font(750, 30);
  g.fillText("All notes", 280, 84);
  box(g, SHARE_BUTTON.x, SHARE_BUTTON.y, SHARE_BUTTON.w, SHARE_BUTTON.h, 10, menuOpen(t) ? "#1f6b4f" : "#2a8a66");
  g.fillStyle = "#ffffff";
  g.font = font(650, 18);
  g.fillText("Share", SHARE_BUTTON.x + 34, SHARE_BUTTON.y + 29);

  // Note cards
  NOTES.forEach(([title, sub], i) => {
    const y = 130 + i * 112;
    box(g, 280, y, 640, 92, 14, "#ffffff");
    g.strokeStyle = "#e4e1d8";
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(280, y, 640, 92, 14);
    g.stroke();
    g.fillStyle = "#1d2420";
    g.font = font(650, 21);
    g.fillText(title, 306, y + 40);
    g.fillStyle = "#6f7a74";
    g.font = font(450, 17);
    g.fillText(sub, 306, y + 68);
  });

  // New-note editor
  box(g, 280, 488, 640, 140, 14, "#ffffff");
  g.fillStyle = "#6f7a74";
  g.font = font(600, 15);
  g.fillText("NEW NOTE", 306, 522);
  const typed = typedAt(t);
  g.fillStyle = typed ? "#1d2420" : "#b3b9b5";
  g.font = font(500, 24);
  g.fillText(typed || "Write something…", TYPING.x - 24, TYPING.y + 14);
  if (typed && Math.floor(t * 2) % 2 === 0) {
    const w = g.measureText(typed).width;
    g.fillStyle = "#2a8a66";
    g.fillRect(TYPING.x - 24 + w + 3, TYPING.y - 10, 2, 30);
  }

  // Share menu
  if (menuOpen(t)) {
    const k = ease((t - MENU.open) / 0.15);
    g.save();
    g.globalAlpha = k;
    g.shadowColor = "rgba(20, 30, 25, 0.25)";
    g.shadowBlur = 24;
    g.shadowOffsetY = 8;
    box(g, MENU.x, MENU.y, MENU.w, MENU.h, 14, "#ffffff");
    g.restore();
    g.save();
    g.globalAlpha = k;
    const items = ["Copy link", "Invite people", "Export as PDF"];
    items.forEach((s, i) => {
      const y = MENU.y + 18 + i * 52;
      if (i === 1 && t > 2.3) box(g, MENU.x + 10, y, MENU.w - 20, 44, 9, "#e5f2ec");
      g.fillStyle = "#1d2420";
      g.font = font(550, 18);
      g.fillText(s, MENU.x + 26, y + 29);
    });
    g.restore();
  }

  // Pointer
  const [cx, cy] = cursorAt(t);
  g.save();
  g.translate(cx, cy);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, 26);
  g.lineTo(7, 20);
  g.lineTo(12, 31);
  g.lineTo(17, 29);
  g.lineTo(12, 18);
  g.lineTo(21, 18);
  g.closePath();
  g.fillStyle = "#111111";
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2;
  g.stroke();
  g.fill();
  g.restore();
}
