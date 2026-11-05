import { describe, expect, it } from "vitest";
import { cameraAt, easeInOut, fitFrame, sourceWindow, ZOOM_RAMP } from "./layout";

describe("fitFrame", () => {
  it("centers a 16:9 video inside a 16:9 canvas with padding", () => {
    const r = fitFrame({ width: 1920, height: 1080 }, { width: 1280, height: 720 }, 0.1);
    // padding = 108px on the short side → box 1704x864, limited by height
    expect(r.height).toBeCloseTo(864);
    expect(r.width).toBeCloseTo(1536);
    expect(r.x).toBeCloseTo(192);
    expect(r.y).toBeCloseTo(108);
  });

  it("letterboxes a wide video in a portrait canvas", () => {
    const r = fitFrame({ width: 1080, height: 1920 }, { width: 1920, height: 1080 }, 0);
    expect(r.width).toBeCloseTo(1080);
    expect(r.height).toBeCloseTo(607.5);
    expect(r.y).toBeCloseTo((1920 - 607.5) / 2);
  });

  it("clamps out-of-range padding", () => {
    const r = fitFrame({ width: 100, height: 100 }, { width: 100, height: 100 }, 5);
    expect(r.width).toBeGreaterThan(0);
  });

  it("handles a video with no size yet", () => {
    const r = fitFrame({ width: 200, height: 100 }, { width: 0, height: 0 }, 0.1);
    expect(r).toEqual({ x: 10, y: 10, width: 180, height: 80 });
  });
});

describe("cameraAt", () => {
  const seg = { start: 2, end: 6, scale: 2, focusX: 0.8, focusY: 0.2 };

  it("is idle outside segments", () => {
    expect(cameraAt(1, [seg]).scale).toBe(1);
    expect(cameraAt(7, [seg]).scale).toBe(1);
  });

  it("reaches full zoom after the ramp", () => {
    const c = cameraAt(2 + ZOOM_RAMP + 0.1, [seg]);
    expect(c.scale).toBeCloseTo(2);
    expect(c.focusX).toBeCloseTo(0.8);
  });

  it("eases continuously at the edges", () => {
    expect(cameraAt(2, [seg]).scale).toBeCloseTo(1);
    expect(cameraAt(6, [seg]).scale).toBeCloseTo(1);
    const mid = cameraAt(2 + ZOOM_RAMP / 2, [seg]).scale;
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(2);
  });

  it("handles very short segments", () => {
    const c = cameraAt(1.05, [{ start: 1, end: 1.1, scale: 3, focusX: 0.5, focusY: 0.5 }]);
    expect(c.scale).toBeCloseTo(3);
  });
});

describe("sourceWindow", () => {
  it("covers the full video when not zoomed", () => {
    expect(sourceWindow({ width: 100, height: 50 }, { scale: 1, focusX: 0.5, focusY: 0.5 })).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
  });

  it("stays inside the video near edges", () => {
    const w = sourceWindow({ width: 100, height: 100 }, { scale: 2, focusX: 1, focusY: 0 });
    expect(w).toEqual({ x: 50, y: 0, width: 50, height: 50 });
  });
});

describe("easeInOut", () => {
  it("maps endpoints", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
});
