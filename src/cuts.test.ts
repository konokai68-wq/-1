import { describe, expect, it } from "vitest";
import { addCut, cutIndexAt, keptDuration, keptSpans, skipCuts, toOutputTime, toSourceTime } from "./cuts";

describe("addCut", () => {
  it("adds a one-second cut at the playhead, kept sorted", () => {
    expect(addCut([{ start: 5, end: 6 }], 2, 10)).toEqual([
      { start: 2, end: 3 },
      { start: 5, end: 6 },
    ]);
  });

  it("stops at the next cut and the end of the video", () => {
    expect(addCut([{ start: 2.5, end: 3 }], 2, 10)).toEqual([
      { start: 2, end: 2.5 },
      { start: 2.5, end: 3 },
    ]);
    expect(addCut([], 9.6, 10)).toEqual([{ start: 9.6, end: 10 }]);
  });

  it("refuses inside an existing cut or when there is no room", () => {
    const cuts = [{ start: 2, end: 3 }];
    expect(addCut(cuts, 2.5, 10)).toEqual(cuts);
    expect(addCut([], 9.9, 10)).toEqual([]);
  });
});

describe("cutIndexAt / skipCuts", () => {
  const cuts = [
    { start: 1, end: 2 },
    { start: 2, end: 3 },
    { start: 5, end: 6 },
  ];
  it("treats the end as outside the cut", () => {
    expect(cutIndexAt(cuts, 1)).toBe(0);
    expect(cutIndexAt(cuts, 6)).toBe(-1);
  });
  it("jumps past touching cuts", () => {
    expect(skipCuts(cuts, 1.5)).toBe(3);
    expect(skipCuts(cuts, 4)).toBe(4);
  });
});

describe("keptSpans", () => {
  it("removes cuts from the trimmed range", () => {
    expect(keptSpans({ start: 1, end: 9 }, [{ start: 0, end: 2 }, { start: 4, end: 5 }, { start: 8.5, end: 10 }])).toEqual([
      { start: 2, end: 4 },
      { start: 5, end: 8.5 },
    ]);
  });
  it("handles overlapping and unsorted cuts", () => {
    expect(keptSpans({ start: 0, end: 10 }, [{ start: 6, end: 7 }, { start: 2, end: 5 }, { start: 3, end: 4 }])).toEqual([
      { start: 0, end: 2 },
      { start: 5, end: 6 },
      { start: 7, end: 10 },
    ]);
  });
  it("is the whole range without cuts", () => {
    expect(keptSpans({ start: 1, end: 3 }, [])).toEqual([{ start: 1, end: 3 }]);
    expect(keptDuration({ start: 1, end: 3 }, [])).toBe(2);
  });
});

describe("time mapping", () => {
  const range = { start: 1, end: 10 };
  const cuts = [{ start: 3, end: 5 }];
  it("maps source to output time", () => {
    expect(toOutputTime(range, cuts, 1)).toBe(0);
    expect(toOutputTime(range, cuts, 2.5)).toBe(1.5);
    expect(toOutputTime(range, cuts, 4)).toBeNull();
    expect(toOutputTime(range, cuts, 5)).toBe(2);
    expect(toOutputTime(range, cuts, 0.5)).toBeNull();
    expect(toOutputTime(range, cuts, 10)).toBeNull();
    expect(keptDuration(range, cuts)).toBe(7);
  });
  it("maps output back to source time", () => {
    expect(toSourceTime(range, cuts, 0)).toBe(1);
    expect(toSourceTime(range, cuts, 1.5)).toBe(2.5);
    expect(toSourceTime(range, cuts, 2)).toBe(5);
    expect(toSourceTime(range, cuts, 99)).toBe(10);
  });
  it("round-trips kept times", () => {
    for (const t of [1, 2, 2.99, 5, 7.25, 9.9]) expect(toSourceTime(range, cuts, toOutputTime(range, cuts, t)!)).toBeCloseTo(t);
  });
});
