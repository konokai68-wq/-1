import { describe, expect, it } from "vitest";
import { MAX_SAMPLES, measureChange, scaleFor, scanSize, scanTimes, suggestZooms, toLuma, type ChangeSample } from "./autoZoom";

const W = 40;
const H = 20;

function frame(fill = 0): Uint8Array {
  return new Uint8Array(W * H).fill(fill);
}

function paint(f: Uint8Array, x0: number, y0: number, x1: number, y1: number, v = 255) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) f[y * W + x] = v;
  return f;
}

describe("measureChange", () => {
  it("reports nothing for identical frames", () => {
    expect(measureChange(frame(), frame(), W, H)).toEqual({ fraction: 0, box: null });
  });

  it("ignores small brightness noise", () => {
    expect(measureChange(frame(100), frame(110), W, H).fraction).toBe(0);
  });

  it("finds the box of a changed rectangle", () => {
    const r = measureChange(frame(), paint(frame(), 10, 5, 20, 10), W, H);
    expect(r.fraction).toBeCloseTo(50 / 800);
    expect(r.box).toEqual({ x0: 10 / W, y0: 5 / H, x1: 20 / W, y1: 10 / H });
  });

  it("does not stretch the box to cover a lone stray pixel", () => {
    const cur = paint(frame(), 10, 5, 20, 10);
    cur[19 * W + 39] = 255;
    expect(measureChange(frame(), cur, W, H).box).toEqual({ x0: 10 / W, y0: 5 / H, x1: 20 / W, y1: 10 / H });
  });
});

describe("toLuma / scanSize", () => {
  it("weights green most", () => {
    expect([...toLuma(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 255, 255, 255, 255]))]).toEqual([76, 149, 255]);
  });

  it("keeps the aspect ratio with an even height", () => {
    expect(scanSize({ width: 1920, height: 1080 })).toEqual({ width: 160, height: 90 });
    expect(scanSize({ width: 1000, height: 1000 })).toEqual({ width: 160, height: 160 });
    expect(scanSize({ width: 0, height: 0 })).toEqual({ width: 160, height: 90 });
  });
});

describe("scanTimes", () => {
  it("samples every quarter second inside the range", () => {
    expect(scanTimes({ start: 1, end: 2 })).toEqual([1, 1.25, 1.5, 1.75]);
  });

  it("skips cut parts", () => {
    expect(scanTimes({ start: 0, end: 2 }, [{ start: 0.5, end: 1.5 }])).toEqual([0, 0.25, 1.5, 1.75]);
  });

  it("caps the number of samples for long clips", () => {
    expect(scanTimes({ start: 0, end: 3600 }).length).toBeLessThanOrEqual(MAX_SAMPLES);
  });
});

describe("scaleFor", () => {
  it("zooms more on smaller areas", () => {
    expect(scaleFor({ x0: 0.4, y0: 0.4, x1: 0.6, y1: 0.5 })).toBe(2.4);
    expect(scaleFor({ x0: 0.3, y0: 0.3, x1: 0.65, y1: 0.5 })).toBe(1.8);
    expect(scaleFor({ x0: 0, y0: 0, x1: 0.8, y1: 0.4 })).toBe(1.4);
  });
});

const local = (t: number, x0 = 0.6, y0 = 0.2, x1 = 0.75, y1 = 0.3): ChangeSample => ({ t, fraction: 0.01, box: { x0, y0, x1, y1 } });
const still = (t: number): ChangeSample => ({ t, fraction: 0, box: null });
const page = (t: number): ChangeSample => ({ t, fraction: 0.6, box: { x0: 0, y0: 0, x1: 1, y1: 1 } });

describe("suggestZooms", () => {
  const range = { start: 0, end: 20 };

  it("zooms on a local change, starting a little before it", () => {
    const z = suggestZooms([still(1), local(2), local(2.25), still(2.5), still(3)], { range });
    expect(z).toHaveLength(1);
    expect(z[0].start).toBe(1.5);
    expect(z[0].end).toBeCloseTo(3.85);
    expect(z[0].focusX).toBeCloseTo(0.675);
    expect(z[0].focusY).toBeCloseTo(0.25);
    expect(z[0].scale).toBe(2.4);
  });

  it("joins changes close in time and splits ones far apart", () => {
    const z = suggestZooms([local(2), local(2.75), local(9)], { range });
    expect(z.map((s) => s.start)).toEqual([1.5, 8.5]);
  });

  it("ignores page changes and noise, and a page change ends a moment", () => {
    const z = suggestZooms([page(1), { t: 1.5, fraction: 0.0001, box: { x0: 0.5, y0: 0.5, x1: 0.51, y1: 0.51 } }, local(4), page(4.5), local(5)], { range });
    expect(z).toHaveLength(2);
    expect(z[0].start).toBe(3.5);
    expect(z[1].start).toBe(z[0].end);
  });

  it("joins a popup opening and closing in the same spot", () => {
    expect(suggestZooms([local(2), local(4)], { range })).toHaveLength(1);
    expect(suggestZooms([local(2), local(4, 0.1, 0.7, 0.2, 0.8)], { range })).toHaveLength(2);
  });

  it("ignores changes spread over most of the screen", () => {
    expect(suggestZooms([{ t: 2, fraction: 0.1, box: { x0: 0, y0: 0, x1: 0.9, y1: 0.9 } }], { range })).toEqual([]);
  });

  it("stays inside the range and keeps at least two seconds", () => {
    const z = suggestZooms([local(0.1)], { range: { start: 0, end: 10 } });
    expect(z[0].start).toBe(0);
    expect(z[0].end).toBe(2);
    expect(suggestZooms([local(9.9)], { range: { start: 0, end: 10 } })[0].end).toBe(10);
  });

  it("caps long moments at eight seconds", () => {
    const samples = Array.from({ length: 60 }, (_, i) => local(1 + i * 0.25));
    const z = suggestZooms(samples, { range });
    expect(z[0].end - z[0].start).toBeCloseTo(8);
  });

  it("never overlaps existing zooms", () => {
    const existing = [{ start: 1, end: 3, scale: 1.8, focusX: 0.5, focusY: 0.5 }];
    const z = suggestZooms([local(2.5), local(3), local(3.5)], { range, existing });
    expect(z).toHaveLength(1);
    expect(z[0].start).toBe(3);
    expect(suggestZooms([local(2)], { range, existing })).toEqual([]);
  });
});
