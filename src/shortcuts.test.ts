import { describe, expect, it } from "vitest";
import { actionFor } from "./shortcuts";

describe("actionFor", () => {
  it("maps undo and redo on both platforms", () => {
    expect(actionFor({ key: "z", ctrlKey: true })).toBe("undo");
    expect(actionFor({ key: "z", metaKey: true })).toBe("undo");
    expect(actionFor({ key: "Z", metaKey: true, shiftKey: true })).toBe("redo");
    expect(actionFor({ key: "y", ctrlKey: true })).toBe("redo");
  });

  it("maps plain keys regardless of case", () => {
    expect(actionFor({ key: "I" })).toBe("setIn");
    expect(actionFor({ key: "o" })).toBe("setOut");
    expect(actionFor({ key: "z" })).toBe("addZoom");
    expect(actionFor({ key: " " })).toBe("play");
    expect(actionFor({ key: "Backspace" })).toBe("removeZoom");
    expect(actionFor({ key: "?", shiftKey: true })).toBe("help");
  });

  it("uses Shift for longer steps", () => {
    expect(actionFor({ key: "ArrowLeft" })).toBe("back");
    expect(actionFor({ key: "ArrowRight", shiftKey: true })).toBe("forwardLong");
  });

  it("ignores Alt combos, unknown keys and other modifier combos", () => {
    expect(actionFor({ key: "z", altKey: true })).toBeNull();
    expect(actionFor({ key: "q" })).toBeNull();
    expect(actionFor({ key: "s", ctrlKey: true })).toBeNull();
  });
});
