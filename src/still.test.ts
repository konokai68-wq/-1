import { describe, expect, it } from "vitest";
import { stillFileName } from "./still";

describe("stillFileName", () => {
  it("names the frame by minutes and tenths of a second", () => {
    expect(stillFileName(0)).toBe("panreel-frame-0m00.0s.png");
    expect(stillFileName(3.44)).toBe("panreel-frame-0m03.4s.png");
    expect(stillFileName(65.2)).toBe("panreel-frame-1m05.2s.png");
  });

  it("rounds up into the next minute without showing 60 s", () => {
    expect(stillFileName(59.97)).toBe("panreel-frame-1m00.0s.png");
  });

  it("treats bad times as the start", () => {
    expect(stillFileName(-2)).toBe("panreel-frame-0m00.0s.png");
    expect(stillFileName(Number.NaN)).toBe("panreel-frame-0m00.0s.png");
  });
});
