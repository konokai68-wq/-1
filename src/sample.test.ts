import { describe, expect, it } from "vitest";
import { MENU, SAMPLE_HEIGHT, SAMPLE_SECONDS, SAMPLE_WIDTH, SHARE_BUTTON, TYPING, cursorAt, menuOpen, typedAt } from "./sample";

describe("sample scene", () => {
  it("opens the menu only inside its window", () => {
    expect(menuOpen(MENU.open - 0.01)).toBe(false);
    expect(menuOpen(MENU.open)).toBe(true);
    expect(menuOpen(MENU.close)).toBe(false);
  });

  it("types the note one character at a time and stops at the end", () => {
    expect(typedAt(TYPING.start - 0.01)).toBe("");
    expect(typedAt(TYPING.start)).toBe(TYPING.text[0]);
    expect(typedAt(TYPING.start + TYPING.step * 4.5)).toBe(TYPING.text.slice(0, 5));
    expect(typedAt(SAMPLE_SECONDS)).toBe(TYPING.text);
  });

  it("finishes typing before the clip ends, so the result is visible", () => {
    expect(TYPING.start + TYPING.step * TYPING.text.length).toBeLessThan(SAMPLE_SECONDS - 0.5);
  });

  it("moves the pointer onto the Share button before the menu opens", () => {
    const [x, y] = cursorAt(MENU.open);
    expect(x).toBeGreaterThan(SHARE_BUTTON.x);
    expect(x).toBeLessThan(SHARE_BUTTON.x + SHARE_BUTTON.w);
    expect(y).toBeGreaterThan(SHARE_BUTTON.y);
    expect(y).toBeLessThan(SHARE_BUTTON.y + SHARE_BUTTON.h);
  });

  it("keeps the pointer on screen the whole time", () => {
    for (let t = 0; t <= SAMPLE_SECONDS + 1; t += 0.1) {
      const [x, y] = cursorAt(t);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(SAMPLE_WIDTH);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(SAMPLE_HEIGHT);
    }
  });
});
