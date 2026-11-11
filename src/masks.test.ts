import { describe, expect, it } from "vitest";
import { MAX_MASKS, MIN_MASK, addMask, clampMask, maskHit, maskRect, moveMask, pixelBlock, resizeMask, toSource, type Mask } from "./masks";

const box: Mask = { x: 0.1, y: 0.2, width: 0.3, height: 0.1, look: "pixel" };
const source = { width: 1920, height: 1080 };

describe("clampMask", () => {
  it("keeps boxes inside the video with a minimum size", () => {
    expect(clampMask({ ...box, x: 0.9, y: -1 })).toEqual({ ...box, x: 0.7, y: 0 });
    const tiny = clampMask({ ...box, width: 0, height: 5 });
    expect(tiny.width).toBe(MIN_MASK);
    expect(tiny.height).toBe(1);
    expect(tiny.y).toBe(0);
  });
});

describe("addMask", () => {
  it("adds a centred box and nudges the next one", () => {
    const one = addMask([]);
    expect(one).toHaveLength(1);
    expect(one[0].x + one[0].width / 2).toBeCloseTo(0.5);
    expect(one[0].y + one[0].height / 2).toBeCloseTo(0.5);
    const two = addMask(one, "solid");
    expect(two[1].look).toBe("solid");
    expect(two[1].x).not.toBeCloseTo(one[0].x);
  });

  it("stops at the limit and stays inside the video", () => {
    let masks: Mask[] = [];
    for (let i = 0; i < MAX_MASKS + 3; i++) masks = addMask(masks);
    expect(masks).toHaveLength(MAX_MASKS);
    for (const m of masks) {
      expect(m.x + m.width).toBeLessThanOrEqual(1);
      expect(m.y + m.height).toBeLessThanOrEqual(1);
    }
  });
});

describe("moveMask / resizeMask", () => {
  it("moves without changing size", () => {
    expect(moveMask(box, 0.5, 0.95)).toEqual({ ...box, x: 0.5, y: 0.9 });
  });

  it("resizes from the bottom-right corner", () => {
    const r = resizeMask(box, 0.6, 0.5);
    expect(r.x).toBe(0.1);
    expect(r.width).toBeCloseTo(0.5);
    expect(r.height).toBeCloseTo(0.3);
    const flipped = resizeMask(box, 0, 0);
    expect(flipped.width).toBe(MIN_MASK);
    expect(flipped.height).toBe(MIN_MASK);
    expect(resizeMask(box, 2, 2)).toMatchObject({ width: 0.9, height: 0.8 });
  });
});

describe("maskRect / toSource", () => {
  const content = { x: 100, y: 50, width: 960, height: 540 };

  it("maps a box onto the unzoomed frame", () => {
    const win = { x: 0, y: 0, ...source };
    expect(maskRect(box, source, win, content)).toEqual({ x: 196, y: 158, width: 288, height: 54 });
  });

  it("follows the zoom window", () => {
    // 2× zoom on the top-left quarter: the box doubles in size.
    const win = { x: 0, y: 0, width: 960, height: 540 };
    const r = maskRect(box, source, win, content);
    expect(r).toEqual({ x: 292, y: 266, width: 576, height: 108 });
    const p = toSource(r.x, r.y, source, win, content);
    expect(p.x).toBeCloseTo(box.x);
    expect(p.y).toBeCloseTo(box.y);
  });
});

describe("maskHit", () => {
  const rects = [
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 50, y: 50, width: 100, height: 100 },
  ];

  it("prefers the top box and its corner handle", () => {
    expect(maskHit(rects, 60, 60, 10)).toEqual({ index: 1, part: "body" });
    expect(maskHit(rects, 20, 20, 10)).toEqual({ index: 0, part: "body" });
    expect(maskHit(rects, 155, 152, 10)).toEqual({ index: 1, part: "corner" });
    expect(maskHit(rects, 300, 300, 10)).toBeNull();
  });
});

describe("pixelBlock", () => {
  it("scales with the canvas", () => {
    expect(pixelBlock({ width: 1920, height: 1080 })).toBe(24);
    expect(pixelBlock({ width: 100, height: 100 })).toBe(6);
  });
});
