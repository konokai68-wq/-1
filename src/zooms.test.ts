import { describe, expect, it } from "vitest";
import { addZoom, DEFAULT_ZOOM_LENGTH, formatTime, formatTimeFine, MIN_ZOOM_LENGTH, resizeZoom, zoomIndexAt } from "./zooms";

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

describe("resizeZoom", () => {
  const two = addZoom(addZoom([], 2, 20), 8, 20); // [2,5] [8,11]

  it("moves an edge", () => {
    expect(resizeZoom(two, 0, "end", 6, 20)[0].end).toBe(6);
    expect(resizeZoom(two, 1, "start", 7, 20)[1].start).toBe(7);
  });

  it("does not overlap neighbours or leave the clip", () => {
    expect(resizeZoom(two, 0, "end", 9, 20)[0].end).toBe(8);
    expect(resizeZoom(two, 1, "start", 3, 20)[1].start).toBe(5);
    expect(resizeZoom(two, 0, "start", -1, 20)[0].start).toBe(0);
    expect(resizeZoom(two, 1, "end", 30, 20)[1].end).toBe(20);
  });

  it("keeps a minimum length", () => {
    expect(resizeZoom(two, 0, "start", 4.9, 20)[0].start).toBe(5 - MIN_ZOOM_LENGTH);
    expect(resizeZoom(two, 0, "end", 0, 20)[0].end).toBe(2 + MIN_ZOOM_LENGTH);
  });

  it("does not mutate the input", () => {
    resizeZoom(two, 0, "end", 6, 20);
    expect(two[0].end).toBe(5);
  });
});

describe("formatTimeFine", () => {
  it("shows tenths", () => {
    expect(formatTimeFine(65.34)).toBe("1:05.3");
    expect(formatTimeFine(2.96)).toBe("0:03.0");
    expect(formatTimeFine(NaN)).toBe("0:00.0");
  });
});
