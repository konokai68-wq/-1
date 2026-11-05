import { describe, expect, it } from "vitest";
import { addZoom, DEFAULT_ZOOM_LENGTH, formatTime, zoomIndexAt } from "./zooms";

describe("addZoom", () => {
  it("adds a default-length zoom", () => {
    const z = addZoom([], 1, 20);
    expect(z).toHaveLength(1);
    expect(z[0].end - z[0].start).toBe(DEFAULT_ZOOM_LENGTH);
  });

  it("stops before the next zoom", () => {
    const z = addZoom(addZoom([], 5, 20), 3, 20);
    expect(z.map((s) => [s.start, s.end])).toEqual([
      [3, 5],
      [5, 8],
    ]);
  });

  it("refuses to start inside another zoom", () => {
    const one = addZoom([], 2, 20);
    expect(addZoom(one, 3, 20)).toHaveLength(1);
  });

  it("clips at the end of the video and refuses tiny zooms", () => {
    expect(addZoom([], 9, 10)[0].end).toBe(10);
    expect(addZoom([], 9.8, 10)).toHaveLength(0);
  });
});

describe("zoomIndexAt", () => {
  it("finds the covering zoom", () => {
    const z = addZoom([], 2, 20);
    expect(zoomIndexAt(z, 3)).toBe(0);
    expect(zoomIndexAt(z, 10)).toBe(-1);
  });
});

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.4)).toBe("1:05");
    expect(formatTime(NaN)).toBe("0:00");
  });
});
