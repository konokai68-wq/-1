import { describe, expect, it } from "vitest";
import { fullTrim, isFullTrim, MIN_TRIM_LENGTH, playStart, setTrimEdge } from "./trim";

describe("setTrimEdge", () => {
  it("moves the start and end", () => {
    let t = fullTrim(10);
    t = setTrimEdge(t, "start", 2, 10);
    t = setTrimEdge(t, "end", 7.5, 10);
    expect(t).toEqual({ start: 2, end: 7.5 });
  });

  it("stays inside the clip", () => {
    const t = fullTrim(10);
    expect(setTrimEdge(t, "start", -3, 10).start).toBe(0);
    expect(setTrimEdge(t, "end", 99, 10).end).toBe(10);
  });

  it("keeps a minimum length", () => {
    const t = { start: 2, end: 6 };
    expect(setTrimEdge(t, "start", 5.9, 10).start).toBe(6 - MIN_TRIM_LENGTH);
    expect(setTrimEdge(t, "end", 1, 10).end).toBe(2 + MIN_TRIM_LENGTH);
  });

  it("copes with clips shorter than the minimum", () => {
    const t = setTrimEdge(fullTrim(0.3), "start", 0.2, 0.3);
    expect(t.start).toBe(0);
    expect(t.end).toBe(0.3);
  });
});

describe("isFullTrim / playStart", () => {
  it("detects an untouched trim", () => {
    expect(isFullTrim(fullTrim(8), 8)).toBe(true);
    expect(isFullTrim({ start: 1, end: 8 }, 8)).toBe(false);
  });

  it("rewinds to the trim start when outside it", () => {
    const t = { start: 2, end: 6 };
    expect(playStart(t, 1)).toBe(2);
    expect(playStart(t, 6)).toBe(2);
    expect(playStart(t, 3)).toBe(3);
  });
});
