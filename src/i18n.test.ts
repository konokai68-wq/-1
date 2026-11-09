import { describe, expect, it } from "vitest";
import { KEYS, LANGS, isKey, isLang, missingKeys, pickLang, tOr, translate, type Key } from "./i18n";
import { SHORTCUTS } from "./shortcuts";
import { ASPECTS, BACKDROPS } from "./render";
import { FORMATS } from "./exportSettings";
import { TEXT_LOOKS } from "./texts";

describe("pickLang", () => {
  it("prefers the ?lang= query", () => {
    expect(pickLang("?lang=ja", "en", ["en-US"])).toBe("ja");
  });
  it("ignores an unknown query and uses the saved choice", () => {
    expect(pickLang("?lang=xx", "ja", ["en-US"])).toBe("ja");
  });
  it("uses the first supported browser language", () => {
    expect(pickLang("", null, ["fr-FR", "ja-JP", "en"])).toBe("ja");
    expect(pickLang("", "garbage", ["EN-gb"])).toBe("en");
  });
  it("falls back to English", () => {
    expect(pickLang("", null, ["de", "fr"])).toBe("en");
    expect(pickLang("", null, [])).toBe("en");
  });
});

describe("translate", () => {
  it("returns the language's string", () => {
    expect(translate("ja", "rec.start")).toBe("画面を録画");
    expect(translate("en", "rec.start")).toBe("Record screen");
  });
  it("fills {name} slots and leaves unknown ones", () => {
    expect(translate("en", "export.info", { w: 1920, h: 1080, fps: 60 })).toBe("1920 × 1080 at 60 fps.");
    expect(translate("ja", "export.info", { w: 1920, h: 1080, fps: 30 })).toBe("1920 × 1080・30 fps。");
    expect(translate("en", "export.info", { w: 1 })).toBe("1 × {h} at {fps} fps.");
  });
});

describe("dictionaries", () => {
  it("knows its languages", () => {
    expect(LANGS).toContain("ja");
    expect(isLang("ja")).toBe(true);
    expect(isLang("JA")).toBe(false);
  });
  it("Japanese covers every key", () => {
    expect(missingKeys("ja")).toEqual([]);
  });
  it("keeps the same <kbd> keys in translated HTML", () => {
    for (const k of ["trim.note", "cuts.empty", "speeds.empty", "text.empty"] as const) {
      const kbds = (s: string) => (s.match(/<kbd>[^<]*<\/kbd>/g) ?? []).sort();
      expect(kbds(translate("ja", k))).toEqual(kbds(translate("en", k)));
    }
  });
});

describe("names built at run time", () => {
  it("every shortcut, backdrop, canvas size and format has a key matching its English text", () => {
    const pairs: [string, string][] = [
      ...SHORTCUTS.map((s) => [`sc.${s.id}`, s.label] as [string, string]),
      ...BACKDROPS.map((b) => [`bg.${b.id}`, b.name] as [string, string]),
      ...ASPECTS.map((a) => [`aspect.${a.id}`, a.label] as [string, string]),
      ...FORMATS.map((f) => [`format.${f.id}`, f.label] as [string, string]),
      ...TEXT_LOOKS.map((k) => [`look.${k.id}`, k.label] as [string, string]),
    ];
    for (const [key, english] of pairs) {
      expect(isKey(key), key).toBe(true);
      expect(translate("en", key as Key)).toBe(english);
    }
  });
  it("tOr falls back for unknown keys", () => {
    expect(tOr("no.such.key", "Fallback")).toBe("Fallback");
    expect(tOr("bg.harbor", "x")).toBe("Harbor");
  });
});

describe("slots", () => {
  it("every translation keeps the {slot}s of the English text", () => {
    const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const l of LANGS) for (const k of KEYS) expect(slots(translate(l, k)), `${l} ${k}`).toEqual(slots(translate("en", k)));
  });
});
