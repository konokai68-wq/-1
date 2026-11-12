import { describe, expect, it } from "vitest";
import { MAX_LOOKS, addLook, lookSwatch, nextLookName, removeLook, sameStyle, sanitizeLooks, type Look } from "./looks";

const FRAME = { padding: 0.08, radius: 0.025, shadow: 0.6 };
const style = (over: Partial<Omit<Look, "id" | "name">> = {}): Omit<Look, "id" | "name"> => ({
  aspect: "16:9",
  frame: { ...FRAME },
  chrome: "none",
  backdrop: { kind: "gradient", id: "dusk" },
  ...over,
});

describe("sanitizeLooks", () => {
  it("keeps good looks and clamps their values", () => {
    const raw = [{ id: "a", name: " Mine ", aspect: "1:1", frame: { padding: 9, radius: -1, shadow: 0.3 }, chrome: "dark", backdrop: { kind: "solid", color: "#AABBCC" } }];
    expect(sanitizeLooks(raw, FRAME)).toEqual([
      { id: "a", name: "Mine", aspect: "1:1", frame: { padding: 0.3, radius: 0, shadow: 0.3 }, chrome: "dark", backdrop: { kind: "solid", color: "#aabbcc" } },
    ]);
  });

  it("falls back to defaults for broken parts and drops broken looks", () => {
    const raw = [null, { id: "" }, { id: "b", aspect: "9:16", frame: "x", chrome: "neon", backdrop: { kind: "image" } }, { id: "c" }];
    expect(sanitizeLooks(raw, FRAME)).toEqual([{ id: "b", name: "Look", aspect: "9:16", frame: FRAME, chrome: "none", backdrop: null }]);
    expect(sanitizeLooks("nope", FRAME)).toEqual([]);
  });

  it("drops duplicate ids and stops at the limit", () => {
    const raw = Array.from({ length: MAX_LOOKS + 3 }, (_, i) => ({ id: i === 1 ? "0" : String(i), aspect: "16:9" }));
    const looks = sanitizeLooks(raw, FRAME);
    expect(looks).toHaveLength(MAX_LOOKS);
    expect(new Set(looks.map((l) => l.id)).size).toBe(MAX_LOOKS);
  });
});

describe("sameStyle", () => {
  it("compares every styling part", () => {
    expect(sameStyle(style(), style())).toBe(true);
    expect(sameStyle(style(), style({ aspect: "1:1" }))).toBe(false);
    expect(sameStyle(style(), style({ chrome: "light" }))).toBe(false);
    expect(sameStyle(style(), style({ frame: { ...FRAME, shadow: 0.61 } }))).toBe(false);
    expect(sameStyle(style(), style({ backdrop: { kind: "gradient", id: "moss" } }))).toBe(false);
    expect(sameStyle(style(), style({ backdrop: null }))).toBe(false);
    expect(sameStyle(style({ backdrop: null }), style({ backdrop: null }))).toBe(true);
    expect(sameStyle(style({ backdrop: { kind: "solid", color: "#ABCDEF" } }), style({ backdrop: { kind: "solid", color: "#abcdef" } }))).toBe(true);
  });
});

describe("nextLookName / addLook / removeLook", () => {
  it("names looks with the first free number", () => {
    expect(nextLookName([], "Look")).toBe("Look 1");
    expect(nextLookName([{ name: "Look 1" }, { name: "Look 3" }], "Look")).toBe("Look 2");
    expect(nextLookName([{ name: "ルック 1" }], "ルック")).toBe("ルック 2");
  });

  it("adds a copy, refuses duplicates and a full list", () => {
    const s = style();
    const first = addLook([], s, "id1", "Look");
    expect(first.added).toMatchObject({ id: "id1", name: "Look 1", aspect: "16:9" });
    s.frame.padding = 0.2; // the saved look must not follow later edits
    expect(first.looks[0].frame.padding).toBe(0.08);

    const again = addLook(first.looks, style(), "id2", "Look");
    expect(again.added).toBeNull();
    expect(again.existing?.id).toBe("id1");
    expect(again.looks).toHaveLength(1);

    let looks: Look[] = [];
    for (let i = 0; i < MAX_LOOKS; i++) looks = addLook(looks, style({ frame: { ...FRAME, padding: i / 100 } }), `x${i}`, "Look").looks;
    const full = addLook(looks, style({ chrome: "dark" }), "y", "Look");
    expect(full.added).toBeNull();
    expect(full.existing).toBeNull();
    expect(full.looks).toHaveLength(MAX_LOOKS);

    expect(removeLook(looks, "x0").map((l) => l.id)).not.toContain("x0");
    expect(removeLook(looks, "x0")).toHaveLength(MAX_LOOKS - 1);
  });
});

describe("lookSwatch", () => {
  const grads = [{ id: "dusk", stops: ["#111111", "#222222"] }];
  it("shows the gradient, the colour or a checker", () => {
    expect(lookSwatch({ backdrop: { kind: "gradient", id: "dusk" } }, grads)).toBe("linear-gradient(135deg, #111111, #222222)");
    expect(lookSwatch({ backdrop: { kind: "solid", color: "#abcdef" } }, grads)).toBe("#abcdef");
    expect(lookSwatch({ backdrop: null }, grads)).toContain("conic");
    expect(lookSwatch({ backdrop: { kind: "gradient", id: "gone" } }, grads)).toContain("conic");
  });
});
