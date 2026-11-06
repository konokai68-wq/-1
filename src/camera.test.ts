import { describe, expect, it } from "vitest";
import { BUBBLE_MAX, BUBBLE_MIN, bubbleRadius, bubbleRect, nearestCorner, squareCrop } from "./camera";

const wide = { width: 1920, height: 1080 };

describe("bubbleRect", () => {
  it("sits in the chosen corner with a margin", () => {
    const br = bubbleRect(wide, { size: 0.25, corner: "br" });
    expect(br.width).toBe(270);
    expect(br.height).toBe(270);
    expect(br.x + br.width).toBe(1920 - 43);
    expect(br.y + br.height).toBe(1080 - 43);
    const tl = bubbleRect(wide, { size: 0.25, corner: "tl" });
    expect(tl).toMatchObject({ x: 43, y: 43 });
  });

  it("uses the shorter side, so tall canvases get the same relative size", () => {
    const tall = bubbleRect({ width: 1080, height: 1920 }, { size: 0.25, corner: "bl" });
    expect(tall.width).toBe(270);
    expect(tall.x).toBe(43);
    expect(tall.y + tall.height).toBe(1920 - 43);
  });

  it("clamps the size", () => {
    expect(bubbleRect(wide, { size: 0, corner: "tr" }).width).toBe(Math.round(1080 * BUBBLE_MIN));
    expect(bubbleRect(wide, { size: 5, corner: "tr" }).width).toBe(Math.round(1080 * BUBBLE_MAX));
  });
});

describe("squareCrop", () => {
  it("takes the centre square of a landscape frame", () => {
    expect(squareCrop({ width: 1280, height: 720 })).toEqual({ x: 280, y: 0, width: 720, height: 720 });
  });

  it("takes the centre square of a portrait frame", () => {
    expect(squareCrop({ width: 480, height: 640 })).toEqual({ x: 0, y: 80, width: 480, height: 480 });
  });
});

describe("bubbleRadius", () => {
  it("is half the side for a circle and smaller for a rounded square", () => {
    const r = { x: 0, y: 0, width: 200, height: 200 };
    expect(bubbleRadius(r, "circle")).toBe(100);
    expect(bubbleRadius(r, "rounded")).toBeLessThan(100);
  });
});

describe("nearestCorner", () => {
  it("maps each quadrant to its corner", () => {
    expect(nearestCorner(wide, 100, 100)).toBe("tl");
    expect(nearestCorner(wide, 1800, 100)).toBe("tr");
    expect(nearestCorner(wide, 100, 1000)).toBe("bl");
    expect(nearestCorner(wide, 1800, 1000)).toBe("br");
  });
});
