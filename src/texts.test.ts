import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_LENGTH,
  addText,
  arrowGeometry,
  arrowTipHit,
  defaultArrowTip,
  moveArrowTip,
  toggleArrow,
  layoutText,
  moveText,
  textHit,
  textIndexAt,
  textOpacity,
  wrapText,
  type TextNote,
} from "./texts";

// Monospace stand-in: every character is half the font size wide.
const measureAt = (fontSize: number) => (s: string) => s.length * fontSize * 0.5;
const note = (over: Partial<TextNote> = {}): TextNote => ({
  start: 1,
  end: 4,
  text: "Hello",
  x: 0.5,
  y: 0.5,
  size: 0.05,
  look: "dark",
  ...over,
});

describe("addText", () => {
  it("adds a default-length callout at the playhead", () => {
    const list = addText([], 2, 10);
    expect(list).toHaveLength(1);
    expect(list[0].start).toBe(2);
    expect(list[0].end).toBe(2 + DEFAULT_TEXT_LENGTH);
  });

  it("stops at the next callout and at the end of the clip", () => {
    expect(addText([note({ start: 3, end: 5 })], 1.5, 10)[0].end).toBe(3);
    expect(addText([], 9, 10)[0].end).toBe(10);
  });

  it("refuses when the playhead is inside a callout or there is no room", () => {
    const list = [note()];
    expect(addText(list, 2, 10)).toHaveLength(1);
    expect(addText([], 9.8, 10)).toHaveLength(0);
  });
});

describe("textIndexAt / textOpacity", () => {
  it("finds the callout at a time", () => {
    const list = [note({ start: 0, end: 1 }), note({ start: 2, end: 3 })];
    expect(textIndexAt(list, 2.5)).toBe(1);
    expect(textIndexAt(list, 1.5)).toBe(-1);
  });

  it("fades in and out", () => {
    const n = note({ start: 1, end: 4 });
    expect(textOpacity(n, 0.9)).toBe(0);
    expect(textOpacity(n, 1)).toBe(0);
    expect(textOpacity(n, 1.125)).toBeCloseTo(0.5);
    expect(textOpacity(n, 2.5)).toBe(1);
    expect(textOpacity(n, 3.875)).toBeCloseTo(0.5);
    expect(textOpacity(n, 4)).toBe(0);
  });
});

describe("wrapText", () => {
  const m = (s: string) => s.length;
  it("wraps on spaces and keeps newlines", () => {
    expect(wrapText("one two three", m, 7)).toEqual(["one two", "three"]);
    expect(wrapText("a\nb c", m, 10)).toEqual(["a", "b c"]);
  });

  it("keeps a long word whole and caps the line count", () => {
    expect(wrapText("supercalifragilistic ok", m, 5)).toEqual(["supercalifragilistic", "ok"]);
    expect(wrapText("a b c d e", m, 1, 3)).toEqual(["a", "b", "c…"]);
  });
});

describe("layoutText", () => {
  const canvas = { width: 1920, height: 1080 };
  it("centres the pill on the note's position", () => {
    const l = layoutText(canvas, note(), measureAt);
    expect(l.fontSize).toBeCloseTo(54);
    expect(l.lines).toEqual(["Hello"]);
    expect(l.box.x + l.box.width / 2).toBeCloseTo(960);
    expect(l.box.y + l.box.height / 2).toBeCloseTo(540);
  });

  it("keeps the pill inside the canvas", () => {
    const l = layoutText(canvas, note({ x: 1, y: 0 }), measureAt);
    expect(l.box.x + l.box.width).toBeCloseTo(1920);
    expect(l.box.y).toBe(0);
  });

  it("wraps long text to at most 80% of the width", () => {
    const l = layoutText(canvas, note({ text: "word ".repeat(40).trim() }), measureAt);
    expect(l.lines.length).toBeGreaterThan(1);
    expect(l.box.width).toBeLessThanOrEqual(1920 * 0.8 + 1);
  });
});

describe("textHit / moveText", () => {
  const canvas = { width: 1920, height: 1080 };
  it("hits the visible callout only", () => {
    const list = [note()];
    expect(textHit(list, 2, canvas, 960, 540, measureAt)).toBe(0);
    expect(textHit(list, 2, canvas, 100, 100, measureAt)).toBe(-1);
    expect(textHit(list, 5, canvas, 960, 540, measureAt)).toBe(-1);
  });

  it("clamps the position to the canvas", () => {
    const m = moveText(note(), 1.4, -0.2);
    expect(m.x).toBe(1);
    expect(m.y).toBe(0);
  });
});

describe("arrows", () => {
  const canvas = { width: 1920, height: 1080 };
  const base = { start: 0, end: 3, text: "Hi", x: 0.5, y: 0.86, size: 0.05, look: "dark" as const };

  it("toggles an arrow pointing up from a low callout, and off again", () => {
    const on = toggleArrow(base);
    expect(on.arrow!.y).toBeLessThan(base.y);
    expect(on.arrow!.x).toBeGreaterThan(0);
    const off = toggleArrow(on);
    expect(off.arrow).toBeUndefined();
    expect("arrow" in off).toBe(false);
  });

  it("points down from a high callout and inwards from the edges", () => {
    const tip = defaultArrowTip({ ...base, x: 0.1, y: 0.1 });
    expect(tip.y).toBeGreaterThan(0.1);
    expect(tip.x).toBeGreaterThan(0.1);
    expect(defaultArrowTip({ ...base, x: 0.9 }).x).toBeLessThan(0.9);
  });

  it("starts the shaft outside the pill and ends at the tip", () => {
    const note = { ...base, arrow: { x: 0.5, y: 0.3 } };
    const box = { x: 860, y: 880, width: 200, height: 100 };
    const g = arrowGeometry(canvas, note, box)!;
    expect(g.head[0]).toEqual({ x: 960, y: 0.3 * 1080 });
    expect(g.from.x).toBeCloseTo(960);
    expect(g.from.y).toBeLessThan(box.y);
    // The neck sits between the tail and the tip.
    expect(g.neck.y).toBeGreaterThan(g.head[0].y);
    expect(g.neck.y).toBeLessThan(g.from.y);
    // Barbs are symmetric about the shaft.
    expect(g.head[1].y).toBeCloseTo(g.head[2].y);
    expect(g.head[1].x - 960).toBeCloseTo(960 - g.head[2].x);
  });

  it("starts at the callout centre without a pill and skips tips that are too close", () => {
    const bare = arrowGeometry(canvas, { ...base, text: "", arrow: { x: 0.8, y: 0.86 } }, null)!;
    expect(bare.from).toEqual({ x: 960, y: 0.86 * 1080 });
    expect(arrowGeometry(canvas, { ...base, arrow: { x: 0.5, y: 0.85 } }, { x: 860, y: 880, width: 200, height: 100 })).toBeNull();
    expect(arrowGeometry(canvas, base, null)).toBeNull();
  });

  it("hits the tip only while the callout shows", () => {
    const notes = [{ ...base, arrow: { x: 0.25, y: 0.25 } }];
    expect(arrowTipHit(notes, 1, canvas, 480 + 10, 270 - 10)).toBe(0);
    expect(arrowTipHit(notes, 1, canvas, 700, 270)).toBe(-1);
    expect(arrowTipHit(notes, 4, canvas, 480, 270)).toBe(-1);
    expect(arrowTipHit([base], 1, canvas, 480, 270)).toBe(-1);
  });

  it("keeps a dragged tip on the canvas", () => {
    expect(moveArrowTip(base, 1.4, -0.2).arrow).toEqual({ x: 1, y: 0 });
  });
});
