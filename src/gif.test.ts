import { describe, expect, it } from "vitest";
import { GIF_MAX_SECONDS, gifSize, gifTooLong, planGif } from "./gif";

describe("gifSize", () => {
  it("uses a 480px shorter side and keeps the aspect ratio", () => {
    expect(gifSize({ width: 1920, height: 1080 })).toEqual({ width: 854, height: 480 });
    expect(gifSize({ width: 1080, height: 1920 })).toEqual({ width: 480, height: 854 });
    expect(gifSize({ width: 1080, height: 1080 })).toEqual({ width: 480, height: 480 });
  });
});

describe("planGif", () => {
  it("samples the trimmed range at the frame rate", () => {
    const plan = planGif({ start: 2, end: 3 }, 15);
    expect(plan.times).toHaveLength(15);
    expect(plan.times[0]).toBe(2);
    expect(plan.times[14]).toBeCloseTo(2 + 14 / 15);
    expect(plan.times.every((t) => t < 3)).toBe(true);
  });

  it("keeps the total length exact with centisecond delays", () => {
    const plan = planGif({ start: 0, end: 4 }, 15);
    expect(plan.delays.every((d) => d % 10 === 0)).toBe(true);
    expect(plan.delays.reduce((a, b) => a + b, 0)).toBe(4000);
    expect(new Set(plan.delays)).toEqual(new Set([60, 70]));
  });

  it("always yields at least one frame", () => {
    expect(planGif({ start: 1, end: 1 }).times).toEqual([1]);
  });
});

describe("gifTooLong", () => {
  it("allows clips up to the limit", () => {
    expect(gifTooLong({ start: 5, end: 5 + GIF_MAX_SECONDS })).toBe(false);
    expect(gifTooLong({ start: 0, end: GIF_MAX_SECONDS + 0.5 })).toBe(true);
  });
});
