import { describe, expect, it } from "vitest";
import { cameraAt, sourceWindow, type ZoomSegment } from "./layout";
import { BLUR_SHUTTER, MAX_BLUR_SAMPLES, blurWindows, windowMovePx } from "./motionBlur";

const video = { width: 1920, height: 1080 };
const zoom: ZoomSegment = { start: 1, end: 4, scale: 2.4, focusX: 0.8, focusY: 0.2 };

describe("blurWindows", () => {
  it("keeps a still frame sharp", () => {
    expect(blurWindows(video, [], 2, 1600)).toHaveLength(1);
    // Fully zoomed in, between the ramps: the camera does not move.
    expect(blurWindows(video, [zoom], 2.5, 1600)).toEqual([sourceWindow(video, cameraAt(2.5, [zoom]))]);
    // Before the zoom starts.
    expect(blurWindows(video, [zoom], 0.5, 1600)).toHaveLength(1);
  });

  it("averages several views while zooming in, ending on the frame's own window", () => {
    const w = blurWindows(video, [zoom], 1.3, 1600);
    expect(w.length).toBeGreaterThan(2);
    expect(w.length).toBeLessThanOrEqual(MAX_BLUR_SAMPLES);
    expect(w[w.length - 1]).toEqual(sourceWindow(video, cameraAt(1.3, [zoom])));
    expect(w[0]).toEqual(sourceWindow(video, cameraAt(1.3 - BLUR_SHUTTER, [zoom])));
    // Zooming in: each view is narrower than the one before.
    for (let i = 1; i < w.length; i++) expect(w[i].width).toBeLessThan(w[i - 1].width);
  });

  it("blurs while zooming out too", () => {
    expect(blurWindows(video, [zoom], 3.7, 1600).length).toBeGreaterThan(2);
  });

  it("uses fewer views on a small output", () => {
    const big = blurWindows(video, [zoom], 1.05, 3800).length;
    const small = blurWindows(video, [zoom], 1.05, 300).length;
    expect(small).toBeLessThan(big);
  });

  it("stays sharp for an empty video or output", () => {
    expect(blurWindows({ width: 0, height: 0 }, [zoom], 1.3, 1600)).toHaveLength(1);
    expect(blurWindows(video, [zoom], 1.3, 0)).toHaveLength(1);
  });
});

describe("windowMovePx", () => {
  it("measures the furthest corner in output pixels", () => {
    const a = { x: 0, y: 0, width: 1000, height: 500 };
    const b = { x: 10, y: 0, width: 1000, height: 500 };
    expect(windowMovePx(a, b, 2000)).toBe(20);
    expect(windowMovePx(a, a, 2000)).toBe(0);
  });
});
