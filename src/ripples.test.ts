import { describe, expect, it } from "vitest";
import { ZOOM_RAMP } from "./layout";
import { RIPPLE_LENGTH, rippleAt, rippleShape, rippleStart } from "./ripples";

const zoom = { start: 1, end: 4, scale: 2, focusX: 0.3, focusY: 0.7 };

describe("ripples", () => {
  it("starts once the zoom has eased in", () => {
    expect(rippleStart(zoom)).toBeCloseTo(1 + ZOOM_RAMP);
    expect(rippleStart({ ...zoom, end: 1.6 })).toBeCloseTo(1.3);
  });

  it("shows at the aim point for RIPPLE_LENGTH seconds", () => {
    const t0 = 1 + ZOOM_RAMP;
    expect(rippleAt([zoom], t0 - 0.01)).toBeNull();
    expect(rippleAt([zoom], t0)).toEqual({ x: 0.3, y: 0.7, progress: 0 });
    expect(rippleAt([zoom], t0 + RIPPLE_LENGTH / 2)?.progress).toBeCloseTo(0.5);
    expect(rippleAt([zoom], t0 + RIPPLE_LENGTH)).toBeNull();
    expect(rippleAt([], t0)).toBeNull();
  });

  it("never outlives a short zoom", () => {
    const short = { ...zoom, end: 2 };
    expect(rippleAt([short], 1.7)).not.toBeNull();
    expect(rippleAt([short], 2)).toBeNull();
  });

  it("picks the zoom that is rippling", () => {
    const later = { ...zoom, start: 5, end: 8, focusX: 0.9 };
    expect(rippleAt([zoom, later], 5 + ZOOM_RAMP + 0.1)?.x).toBe(0.9);
  });

  it("grows and fades", () => {
    expect(rippleShape(0)).toEqual({ size: 0.25, alpha: 1 });
    expect(rippleShape(1)).toEqual({ size: 1, alpha: 0 });
    const mid = rippleShape(0.5);
    expect(mid.size).toBeGreaterThan(0.25);
    expect(mid.size).toBeLessThan(1);
    expect(mid.alpha).toBeCloseTo(0.75);
    expect(rippleShape(2)).toEqual(rippleShape(1));
  });
});
