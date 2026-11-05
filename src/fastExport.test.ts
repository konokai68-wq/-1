import { describe, expect, it } from "vitest";
import { planOutput, sourceTime } from "./fastExport";

describe("planOutput", () => {
  it("prefers MP4/H.264 when AAC is available for the soundtrack", () => {
    expect(planOutput({ video: ["vp9", "avc"], audio: ["aac", "opus"] }, true)).toEqual({ container: "mp4", codec: "avc" });
  });
  it("uses MP4 for silent clips even without an AAC encoder", () => {
    expect(planOutput({ video: ["avc"], audio: [] }, false)).toEqual({ container: "mp4", codec: "avc" });
  });
  it("switches to WebM rather than dropping audio when AAC is missing", () => {
    expect(planOutput({ video: ["avc", "vp9"], audio: ["opus"] }, true)).toEqual({ container: "webm", codec: "vp9" });
    expect(planOutput({ video: ["vp8"], audio: ["opus"] }, true)).toEqual({ container: "webm", codec: "vp8" });
  });
  it("returns null when the clip can't be exported with its sound", () => {
    expect(planOutput({ video: ["avc", "vp9"], audio: [] }, true)).toBeNull();
  });
  it("returns null when no video codec is encodable", () => {
    expect(planOutput({ video: [], audio: ["aac"] }, false)).toBeNull();
  });
});

describe("sourceTime", () => {
  it("maps output time back onto the source timeline", () => {
    expect(sourceTime(0, 1.5)).toBe(1.5);
    expect(sourceTime(2.25, 1.5)).toBe(3.75);
  });
});
