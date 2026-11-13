import { describe, expect, it } from "vitest";
import {
  FULL_CROP,
  MIN_CROP,
  cropEdges,
  cropFromEdges,
  cropFromPoints,
  cropPixels,
  isFullCrop,
  sameCrop,
  sanitizeCrop,
  setCropEdge,
  toView,
  viewCenter,
  viewSize,
  viewWindows,
  zoomsIntoView,
} from "./crop";

const SRC = { width: 2000, height: 1000 };

describe("cropFromPoints", () => {
  it("turns a dragged box into a crop, whichever corner came first", () => {
    const want = { x: 0.6, y: 0.05, width: 0.35, height: 0.4 };
    expect(cropFromPoints({ x: 0.6, y: 0.05 }, { x: 0.95, y: 0.45 })).toEqual(want);
    expect(cropFromPoints({ x: 0.95, y: 0.45 }, { x: 0.6, y: 0.05 })).toEqual(want);
    expect(cropFromPoints({ x: 0.95, y: 0.05 }, { x: 0.6, y: 0.45 })).toEqual(want);
  });

  it("clamps to the video", () => {
    expect(cropFromPoints({ x: -0.2, y: -1 }, { x: 0.5, y: 2 })).toEqual({ x: 0, y: 0, width: 0.5, height: 1 });
  });

  it("grows a thin box to the minimum size around its middle, inside the video", () => {
    const c = cropFromPoints({ x: 0.5, y: 0.98 }, { x: 0.52, y: 1 });
    expect(c.width).toBeCloseTo(MIN_CROP);
    expect(c.height).toBeCloseTo(MIN_CROP);
    expect(c.x).toBeCloseTo(0.46);
    expect(c.y + c.height).toBeCloseTo(1);
  });

  it("can keep a small corner far from the middle (survives sanitizing)", () => {
    const c = cropFromPoints({ x: 0.7, y: 0.75 }, { x: 0.95, y: 0.95 });
    expect(c).toEqual({ x: 0.7, y: 0.75, width: 0.25, height: 0.2 });
    expect(sanitizeCrop(c)).toEqual(c);
  });

  it("ignores NaN", () => {
    expect(cropFromPoints({ x: NaN, y: 0 }, { x: 1, y: 1 })).toEqual(FULL_CROP);
  });
});

describe("crop edges", () => {
  it("round-trips between edges and a crop", () => {
    const c = cropFromEdges({ left: 0.1, right: 0.2, top: 0.05, bottom: 0.15 });
    expect(c).toEqual({ x: 0.1, y: 0.05, width: 0.7, height: 0.8 });
    const e = cropEdges(c);
    expect(e.left).toBeCloseTo(0.1);
    expect(e.right).toBeCloseTo(0.2);
    expect(e.top).toBeCloseTo(0.05);
    expect(e.bottom).toBeCloseTo(0.15);
  });

  it("always keeps at least MIN_CROP of each axis", () => {
    const c = cropFromEdges({ left: 0.45, right: 0.45, top: 0.45, bottom: 0.45 });
    expect(c.width).toBeCloseTo(MIN_CROP);
    expect(c.height).toBeCloseTo(MIN_CROP);
    expect(c.x).toBeCloseTo(0.45);
  });

  it("clamps negative, huge and NaN edges", () => {
    expect(cropFromEdges({ left: -1, right: NaN, top: 9, bottom: 0 })).toEqual({ x: 0, y: 0.9, width: 1, height: 0.1 });
  });

  it("changes one edge and keeps the others", () => {
    const c = setCropEdge(setCropEdge(FULL_CROP, "left", 0.2), "bottom", 0.1);
    expect(c).toEqual({ x: 0.2, y: 0, width: 0.8, height: 0.9 });
    expect(setCropEdge(c, "left", 0)).toEqual({ x: 0, y: 0, width: 1, height: 0.9 });
  });

  it("knows the full crop and compares crops", () => {
    expect(isFullCrop(FULL_CROP)).toBe(true);
    expect(isFullCrop(setCropEdge(FULL_CROP, "top", 0.01))).toBe(false);
    expect(sameCrop(cropFromEdges({ left: 0.1, right: 0, top: 0, bottom: 0 }), { x: 0.1, y: 0, width: 0.9, height: 1 })).toBe(true);
  });
});

describe("sanitizeCrop", () => {
  it("falls back to the whole video for missing or broken data", () => {
    expect(sanitizeCrop(undefined)).toEqual(FULL_CROP);
    expect(sanitizeCrop({ x: 0.1, y: "a", width: 1, height: 1 })).toEqual(FULL_CROP);
    expect(sanitizeCrop({ x: Infinity, y: 0, width: 1, height: 1 })).toEqual(FULL_CROP);
  });

  it("keeps a good crop and pulls a bad one back inside the video", () => {
    expect(sanitizeCrop({ x: 0.1, y: 0.2, width: 0.5, height: 0.6 })).toEqual({ x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
    const c = sanitizeCrop({ x: 0.3, y: 0, width: 0.01, height: 2 });
    expect(c.width).toBeGreaterThanOrEqual(MIN_CROP - 1e-9);
    expect(c.y + c.height).toBeLessThanOrEqual(1);
  });
});

describe("view geometry", () => {
  const c = { x: 0.25, y: 0.1, width: 0.5, height: 0.8 };

  it("converts the crop to source pixels and a view size", () => {
    expect(cropPixels(SRC, c)).toEqual({ x: 500, y: 100, width: 1000, height: 800 });
    expect(viewSize(SRC, c)).toEqual({ width: 1000, height: 800 });
  });

  it("shows exactly the cropped part when not zoomed", () => {
    expect(viewWindows(SRC, c, [], 1, 1000, true)).toEqual([{ x: 500, y: 100, width: 1000, height: 800 }]);
    expect(viewWindows(SRC, FULL_CROP, [], 1, 1000, false)).toEqual([{ x: 0, y: 0, width: 2000, height: 1000 }]);
  });

  it("zooms inside the cropped view and never leaves it", () => {
    const zoom = { start: 0, end: 4, scale: 2, focusX: 1, focusY: 1 };
    const [w] = viewWindows(SRC, c, [zoom], 2, 1000, false);
    expect(w.width).toBe(500);
    expect(w.height).toBe(400);
    // Aimed at the bottom-right corner: the window ends at the crop's corner.
    expect(w.x + w.width).toBeCloseTo(1500);
    expect(w.y + w.height).toBeCloseTo(900);
  });

  it("returns several windows during a zoom ramp with motion blur, all inside the crop", () => {
    const zoom = { start: 0, end: 4, scale: 2, focusX: 0.2, focusY: 0.3 };
    const wins = viewWindows(SRC, c, [zoom], 0.3, 1920, true);
    expect(wins.length).toBeGreaterThan(1);
    for (const w of wins) {
      expect(w.x).toBeGreaterThanOrEqual(500 - 1e-6);
      expect(w.x + w.width).toBeLessThanOrEqual(1500 + 1e-6);
    }
  });

  it("maps source points into the view and drops cut-off ones", () => {
    expect(toView(c, 0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
    expect(toView(c, 0.25, 0.9)).toEqual({ x: 0, y: 1 });
    expect(toView(c, 0.1, 0.5)).toBeNull();
    expect(viewCenter(c)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("re-aims scanned zooms inside the view", () => {
    const zs = [
      { start: 0, end: 2, scale: 2, focusX: 0.5, focusY: 0.5 },
      { start: 3, end: 5, scale: 1.8, focusX: 0.05, focusY: 0.5 },
      { start: 6, end: 8, scale: 1.4, focusX: 0.7, focusY: 0.1 },
    ];
    expect(zoomsIntoView(zs, c)).toEqual([
      { start: 0, end: 2, scale: 2, focusX: 0.5, focusY: 0.5 },
      { start: 6, end: 8, scale: 1.4, focusX: 0.9, focusY: 0 },
    ]);
    expect(zoomsIntoView(zs, FULL_CROP)).toEqual(zs);
  });
});
