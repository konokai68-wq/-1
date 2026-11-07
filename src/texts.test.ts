import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_LENGTH,
  addText,
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
