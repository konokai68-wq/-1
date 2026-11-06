import { describe, expect, it } from "vitest";
import { History } from "./history";

describe("History", () => {
  it("undoes and redoes in order", () => {
    const h = new History<number>();
    let s = 0;
    h.record(s); s = 1;
    h.record(s); s = 2;
    expect(h.canUndo).toBe(true);
    s = h.undo(s)!; expect(s).toBe(1);
    s = h.undo(s)!; expect(s).toBe(0);
    expect(h.undo(s)).toBeNull();
    s = h.redo(s)!; expect(s).toBe(1);
    s = h.redo(s)!; expect(s).toBe(2);
    expect(h.redo(s)).toBeNull();
  });

  it("drops the redo stack after a new change", () => {
    const h = new History<number>();
    h.record(0);
    expect(h.undo(1)).toBe(0);
    expect(h.canRedo).toBe(true);
    h.record(0);
    expect(h.canRedo).toBe(false);
  });

  it("merges rapid changes with the same key", () => {
    const h = new History<number>();
    h.record(0, "pad", 0);
    h.record(1, "pad", 300);
    h.record(2, "pad", 600);
    expect(h.undo(3)).toBe(0);
    expect(h.canUndo).toBe(false);
  });

  it("does not merge across keys, slow changes, or an undo", () => {
    const h = new History<number>();
    h.record(0, "pad", 0);
    h.record(1, "radius", 100);
    h.record(2, "radius", 5000);
    expect(h.undo(3)).toBe(2);
    h.record(2, "radius", 5100);
    expect(h.undo(3)).toBe(2);
    expect(h.undo(2)).toBe(1);
    expect(h.undo(1)).toBe(0);
  });

  it("keeps at most `limit` steps", () => {
    const h = new History<number>(3);
    for (let i = 0; i < 10; i++) h.record(i);
    expect(h.undo(10)).toBe(9);
    expect(h.undo(9)).toBe(8);
    expect(h.undo(8)).toBe(7);
    expect(h.undo(7)).toBeNull();
  });
});
