import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, exportSize, resolutionById, sanitizeSettings } from "./exportSettings";

describe("exportSize", () => {
  it("keeps 1080p canvases unchanged", () => {
    expect(exportSize({ width: 1920, height: 1080 }, 1080)).toEqual({ width: 1920, height: 1080 });
  });
  it("scales by the shorter side for every aspect", () => {
    expect(exportSize({ width: 1920, height: 1080 }, 720)).toEqual({ width: 1280, height: 720 });
    expect(exportSize({ width: 1080, height: 1920 }, 2160)).toEqual({ width: 2160, height: 3840 });
    expect(exportSize({ width: 1080, height: 1080 }, 1440)).toEqual({ width: 1440, height: 1440 });
    expect(exportSize({ width: 1440, height: 1080 }, 720)).toEqual({ width: 960, height: 720 });
  });
  it("always returns even dimensions", () => {
    const s = exportSize({ width: 1001, height: 999 }, 719);
    expect(s.width % 2).toBe(0);
    expect(s.height % 2).toBe(0);
  });
  it("guards against empty sizes", () => {
    expect(exportSize({ width: 0, height: 0 }, 1080)).toEqual({ width: 2, height: 2 });
  });
});

describe("sanitizeSettings", () => {
  it("keeps valid settings", () => {
    expect(sanitizeSettings({ resolution: "720", frameRate: 30 })).toEqual({ resolution: "720", frameRate: 30 });
  });
  it("replaces unknown or missing values with defaults", () => {
    expect(sanitizeSettings({ resolution: "8k", frameRate: 24 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("junk")).toEqual(DEFAULT_SETTINGS);
  });
});

describe("resolutionById", () => {
  it("falls back to 1080p", () => {
    expect(resolutionById("nope").short).toBe(1080);
    expect(resolutionById("2160").label).toBe("4K");
  });
});
