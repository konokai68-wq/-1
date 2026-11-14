import { describe, expect, it } from "vitest";
import { FADE_LENGTHS, fadeAlpha } from "./fades";

const range = { start: 1, end: 9 }; // 8 s kept

describe("fadeAlpha", () => {
  it("is always 1 when off or unknown", () => {
    expect(fadeAlpha("off", range, [], [], 1)).toBe(1);
    expect(fadeAlpha(undefined, range, [], [], 1)).toBe(1);
  });

  it("starts black, ends near black and is clear in the middle", () => {
    expect(fadeAlpha("long", range, [], [], 1)).toBe(0);
    expect(fadeAlpha("long", range, [], [], 1.5)).toBeCloseTo(0.5);
    expect(fadeAlpha("long", range, [], [], 2)).toBe(1);
    expect(fadeAlpha("long", range, [], [], 5)).toBe(1);
    expect(fadeAlpha("long", range, [], [], 8.5)).toBeCloseTo(0.5);
    expect(fadeAlpha("long", range, [], [], 8.99)).toBeLessThan(0.01);
  });

  it("rises steadily", () => {
    let last = -1;
    for (let t = 1; t <= 2; t += 0.05) {
      const a = fadeAlpha("short", range, [], [], t);
      expect(a).toBeGreaterThanOrEqual(last);
      last = a;
    }
    expect(fadeAlpha("short", range, [], [], 1.5)).toBe(1);
  });

  it("follows the output timeline through cuts and speed-ups", () => {
    // 1–2 s is cut, 2–4 s plays at 4×: 0.5 s of output after the cut.
    const cuts = [{ start: 1, end: 2 }];
    const speeds = [{ start: 2, end: 4, rate: 4 }];
    expect(fadeAlpha("long", range, cuts, speeds, 2)).toBe(0);
    expect(fadeAlpha("long", range, cuts, speeds, 4)).toBeCloseTo(0.5);
    expect(fadeAlpha("long", range, cuts, speeds, 1.5)).toBe(1); // cut away
  });

  it("never takes more than half of a short clip", () => {
    const short = { start: 0, end: 1 };
    expect(fadeAlpha("long", short, [], [], 0.5)).toBe(1);
    expect(fadeAlpha("long", short, [], [], 0.25)).toBeCloseTo(0.5);
  });

  it("lists every length", () => {
    expect(FADE_LENGTHS).toEqual(["off", "short", "long"]);
  });
});
