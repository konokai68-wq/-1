import { describe, expect, it } from "vitest";
import { DEFAULT_BUBBLE } from "./camera";
import { editSummary, sanitizeProject, timeAgo, type ProjectData } from "./project";

const defaults = { aspect: "16:9", bubble: DEFAULT_BUBBLE, frame: { padding: 0.08, radius: 0.025, shadow: 0.6 } };

const good: ProjectData = {
  version: 1,
  name: "demo.webm",
  duration: 10,
  aspect: "1:1",
  frame: { padding: 0.1, radius: 0.03, shadow: 0.5 },
  chrome: "dark",
  motionBlur: false,
  backdrop: { kind: "solid", color: "#112233" },
  bubble: { visible: false, shape: "rounded", size: 0.3, corner: "tl", mirror: false },
  zooms: [{ start: 1, end: 3, scale: 1.8, focusX: 0.2, focusY: 0.7 }],
  trim: { start: 0.5, end: 9 },
  cuts: [{ start: 4, end: 5 }],
  speeds: [{ start: 6, end: 8, rate: 4 }],
  texts: [{ start: 1, end: 4, text: "Hi", x: 0.5, y: 0.2, size: 0.05, look: "accent", arrow: { x: 0.6, y: 0.6 } }],
  masks: [{ x: 0.1, y: 0.1, width: 0.3, height: 0.1, look: "solid" }],
};

describe("sanitizeProject", () => {
  it("keeps a valid project as it is", () => {
    expect(sanitizeProject(JSON.parse(JSON.stringify(good)), defaults)).toEqual(good);
  });

  it("keeps motion blur, and turns it on for older or broken projects", () => {
    expect(sanitizeProject(good, defaults)?.motionBlur).toBe(false);
    const { motionBlur: _, ...old } = good;
    expect(sanitizeProject(JSON.parse(JSON.stringify(old)), defaults)?.motionBlur).toBe(true);
    expect(sanitizeProject({ ...good, motionBlur: "yes" }, defaults)?.motionBlur).toBe(true);
  });

  it("defaults the window chrome for older or broken projects", () => {
    const { chrome: _, ...old } = good;
    expect(sanitizeProject(JSON.parse(JSON.stringify(old)), defaults)?.chrome).toBe("none");
    expect(sanitizeProject({ ...good, chrome: "neon" }, defaults)?.chrome).toBe("none");
  });

  it("rejects things that are not projects", () => {
    expect(sanitizeProject(null, defaults)).toBeNull();
    expect(sanitizeProject({ ...good, version: 2 }, defaults)).toBeNull();
    expect(sanitizeProject({ ...good, duration: 0 }, defaults)).toBeNull();
    expect(sanitizeProject("x", defaults)).toBeNull();
  });

  it("clamps spans into the clip and drops empty or broken ones", () => {
    const p = sanitizeProject(
      {
        ...good,
        trim: { start: 5, end: 2 },
        cuts: [{ start: 9, end: 30 }, { start: 3, end: 3 }, "bad", { start: 1 }],
        zooms: [{ start: 2, end: 4, scale: 99, focusX: -1, focusY: "x" }],
      },
      defaults,
    )!;
    expect(p.trim).toEqual({ start: 0, end: 10 });
    expect(p.cuts).toEqual([{ start: 9, end: 10 }]);
    expect(p.zooms).toEqual([{ start: 2, end: 4, scale: 4, focusX: 0, focusY: 0.5 }]);
  });

  it("drops speed-ups with unknown rates and sorts lists by start", () => {
    const p = sanitizeProject(
      {
        ...good,
        speeds: [
          { start: 6, end: 7, rate: 3 },
          { start: 5, end: 6, rate: 8 },
          { start: 1, end: 2, rate: 2 },
        ],
      },
      defaults,
    )!;
    expect(p.speeds.map((s) => s.rate)).toEqual([2, 8]);
  });

  it("falls back to defaults for unknown settings", () => {
    const p = sanitizeProject(
      { ...good, name: "", backdrop: { kind: "solid", color: "red" }, bubble: { shape: "star", size: 5 }, frame: null },
      defaults,
    )!;
    expect(p.name).toBe("Untitled");
    expect(p.backdrop).toEqual({ kind: "gradient", id: "" });
    expect(p.bubble).toEqual({ ...DEFAULT_BUBBLE, size: 0.45 });
    expect(p.frame).toEqual(defaults.frame);
  });

  it("repairs text callouts and keeps only valid arrows", () => {
    const p = sanitizeProject(
      { ...good, texts: [{ start: 0, end: 2, text: "A", x: 2, y: 0.5, size: 0.05, look: "neon", arrow: { x: "a" } }, { start: 0, end: 1 }] },
      defaults,
    )!;
    expect(p.texts).toEqual([{ start: 0, end: 2, text: "A", x: 1, y: 0.5, size: 0.05, look: "dark" }]);
  });

  it("repairs blur boxes and defaults them for older projects", () => {
    const { masks: _, ...old } = good;
    expect(sanitizeProject(JSON.parse(JSON.stringify(old)), defaults)?.masks).toEqual([]);
    const p = sanitizeProject({ ...good, masks: [{ x: 0.9, y: 0, width: 0.3, height: 0.1, look: "neon" }, { x: "a" }, null] }, defaults)!;
    expect(p.masks).toEqual([{ x: 0.7, y: 0, width: 0.3, height: 0.1, look: "pixel" }]);
    expect(sanitizeProject({ ...good, masks: [{ ...good.masks[0], look: "spotlight" }] }, defaults)!.masks[0].look).toBe("spotlight");
    const timed = sanitizeProject({ ...good, masks: [{ ...good.masks[0], time: { start: 1, end: 99 } }, { ...good.masks[0], time: { start: 3, end: 1 } }] }, defaults)!;
    expect(timed.masks[0].time).toEqual({ start: 1, end: good.duration });
    // A broken time falls back to the whole clip, so the box still hides its spot.
    expect(timed.masks[1].time).toBeUndefined();
  });
});

describe("editSummary", () => {
  it("lists what was added", () => {
    expect(editSummary(good)).toBe("1 zoom · 1 cut · 1 speed-up · 1 text · 1 blur box");
    expect(editSummary(good, "ja")).toBe("ズーム1 · カット1 · 早送り1 · 文字1 · ぼかし1");
    expect(editSummary({ zooms: [], cuts: [], speeds: [], texts: [] })).toBe("");
    expect(editSummary({ ...good, zooms: [good.zooms[0], good.zooms[0]], cuts: [], speeds: [], texts: [], masks: [] })).toBe("2 zooms");
  });
});

describe("timeAgo", () => {
  it("rounds to a friendly unit", () => {
    const now = 1_000_000_000;
    expect(timeAgo(now - 10_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe("3 days ago");
  });
  it("speaks Japanese", () => {
    const now = 1_700_000_000_000;
    expect(timeAgo(now - 10_000, now, "ja")).toBe("たった今");
    expect(timeAgo(now - 5 * 60_000, now, "ja")).toBe("5分前");
    expect(timeAgo(now - 3 * 86_400_000, now, "ja")).toBe("3日前");
  });
});
