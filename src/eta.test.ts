import { describe, expect, it } from "vitest";
import { etaTracker, formatLeft, withLeft } from "./eta";

describe("etaTracker", () => {
  it("waits until there is enough work and time to guess", () => {
    const eta = etaTracker(1000);
    expect(eta(0.5, 1500)).toBeNull(); // only 0.5 s in
    expect(eta(0.01, 5000)).toBeNull(); // only 1 % done
    expect(eta(Number.NaN, 5000)).toBeNull();
  });

  it("projects the average rate onto the remaining work", () => {
    const eta = etaTracker(0);
    expect(eta(0.25, 10_000)).toBeCloseTo(30);
    expect(eta(0.5, 10_000)).toBeCloseTo(10);
    expect(eta(1, 10_000)).toBe(0);
  });
});

describe("formatLeft", () => {
  it("rounds like a person would", () => {
    expect(formatLeft(3, "en")).toBe("a few seconds left");
    expect(formatLeft(12, "en")).toBe("about 10 s left");
    expect(formatLeft(23, "en")).toBe("about 25 s left");
    expect(formatLeft(58, "en")).toBe("about 1 min left");
    expect(formatLeft(150, "en")).toBe("about 3 min left");
  });

  it("speaks Japanese", () => {
    expect(formatLeft(3, "ja")).toBe("まもなく完了");
    expect(formatLeft(31, "ja")).toBe("残り約30秒");
    expect(formatLeft(600, "ja")).toBe("残り約10分");
  });
});

describe("withLeft", () => {
  it("adds the guess only when there is one", () => {
    expect(withLeft("Exporting MP4… 4%", null, "en")).toBe("Exporting MP4… 4%");
    expect(withLeft("Exporting MP4… 50%", 20, "en")).toBe("Exporting MP4… 50% · about 20 s left");
  });
});
