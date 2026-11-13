import { describe, expect, it } from "vitest";
import { cameraAt, coverRect, zoomsLinked, ZOOM_LINK_GAP, easeInOut, fitFrame, sourceWindow, windowLayout, WINDOW_BAR, ZOOM_RAMP } from "./layout";

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

describe("cameraAt with linked zooms", () => {
  const a = { start: 1, end: 3, scale: 2, focusX: 0.2, focusY: 0.3 };
  const b = { start: 3.5, end: 6, scale: 2.4, focusX: 0.8, focusY: 0.7 };

  it("links zooms up to ZOOM_LINK_GAP apart, not overlapping or farther", () => {
    expect(zoomsLinked(a, b)).toBe(true);
    expect(zoomsLinked(a, { ...b, start: 3 + ZOOM_LINK_GAP + 0.01 })).toBe(false);
    expect(zoomsLinked(b, a)).toBe(false);
  });

  it("never zooms out to the full view between linked zooms", () => {
    for (let t = a.start + ZOOM_RAMP; t <= b.end - ZOOM_RAMP; t += 0.05) {
      expect(cameraAt(t, [a, b]).scale).toBeGreaterThanOrEqual(2 - 1e-9);
    }
  });

  it("glides from one aim point to the next and is continuous at the ends", () => {
    const from = a.end - ZOOM_RAMP;
    const to = b.start + ZOOM_RAMP;
    expect(cameraAt(from, [a, b]).focusX).toBeCloseTo(0.2);
    expect(cameraAt(to, [a, b]).focusX).toBeCloseTo(0.8);
    expect(cameraAt(to, [a, b]).scale).toBeCloseTo(2.4);
    const mid = cameraAt((from + to) / 2, [a, b]);
    expect(mid.focusX).toBeCloseTo(0.5);
    expect(mid.scale).toBeCloseTo(2.2);
    let last = cameraAt(from, [a, b]).focusX;
    for (let t = from; t <= to; t += 0.01) {
      const x = cameraAt(t, [a, b]).focusX;
      expect(x).toBeGreaterThanOrEqual(last - 1e-9);
      expect(x - last).toBeLessThan(0.05);
      last = x;
    }
  });

  it("still eases in from and out to the full view at the outer edges", () => {
    expect(cameraAt(a.start, [a, b]).scale).toBeCloseTo(1);
    expect(cameraAt(b.end, [a, b]).scale).toBeCloseTo(1);
    expect(cameraAt(7, [a, b]).scale).toBe(1);
  });

  it("works with touching and unsorted zooms", () => {
    const c = { ...b, start: 3 };
    expect(cameraAt(3, [c, a]).focusX).toBeCloseTo(0.5);
    expect(cameraAt(3, [c, a]).scale).toBeCloseTo(2.2);
  });

  it("zooms out between zooms farther apart", () => {
    const far = { ...b, start: 5, end: 7 };
    expect(cameraAt(4.5, [a, far]).scale).toBe(1);
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

describe("coverRect", () => {
  it("fills a wide canvas with a square image by cropping top and bottom", () => {
    const r = coverRect({ width: 1920, height: 1080 }, { width: 1000, height: 1000 });
    expect(r.width).toBeCloseTo(1920);
    expect(r.height).toBeCloseTo(1920);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(-420);
  });

  it("fills a tall canvas with a wide image by cropping the sides", () => {
    const r = coverRect({ width: 1080, height: 1920 }, { width: 1600, height: 900 });
    expect(r.height).toBeCloseTo(1920);
    expect(r.width).toBeCloseTo(3413.33, 1);
    expect(r.x).toBeCloseTo((1080 - 3413.33) / 2, 1);
    expect(r.y).toBeCloseTo(0);
  });

  it("falls back to the full canvas for an empty image", () => {
    expect(coverRect({ width: 100, height: 50 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });
});

describe("windowLayout", () => {
  const canvas = { width: 1920, height: 1080 };
  const video = { width: 1600, height: 900 };

  it("matches fitFrame with no chrome", () => {
    const l = windowLayout(canvas, video, 0.1, "none");
    expect(l.bar).toBeNull();
    expect(l.content).toEqual(fitFrame(canvas, video, 0.1));
    expect(l.outer).toEqual(l.content);
  });

  it("puts a title bar above the recording and keeps its aspect ratio", () => {
    const l = windowLayout(canvas, video, 0.1, "dark");
    expect(l.bar).not.toBeNull();
    const bar = l.bar!;
    expect(bar.y).toBeCloseTo(l.outer.y);
    expect(l.content.y).toBeCloseTo(bar.y + bar.height);
    expect(bar.height + l.content.height).toBeCloseTo(l.outer.height);
    expect(l.content.width / l.content.height).toBeCloseTo(video.width / video.height);
    // Bar height in canvas pixels matches WINDOW_BAR of the longer source side.
    const scale = l.content.width / video.width;
    expect(bar.height).toBeCloseTo(video.width * WINDOW_BAR * scale);
  });

  it("still fits inside the padded canvas", () => {
    const l = windowLayout(canvas, video, 0.1, "light");
    const p = 0.1 * 1080;
    expect(l.outer.y).toBeGreaterThanOrEqual(p - 1e-6);
    expect(l.outer.y + l.outer.height).toBeLessThanOrEqual(1080 - p + 1e-6);
    expect(l.outer.x + l.outer.width / 2).toBeCloseTo(960);
  });

  it("falls back to fitFrame for an empty video", () => {
    const l = windowLayout(canvas, { width: 0, height: 0 }, 0.1, "dark");
    expect(l.bar).toBeNull();
  });
});
