import { describe, expect, it } from "vitest";
import { pagesUrl, repoUrl, socialMetaTags } from "./siteMeta";

describe("pagesUrl", () => {
  it("builds the project Pages URL", () => {
    expect(pagesUrl("konokai68-wq/panreel")).toBe("https://konokai68-wq.github.io/panreel/");
    expect(pagesUrl("Some-Owner/-1")).toBe("https://some-owner.github.io/-1/");
  });

  it("serves <owner>.github.io repos from the root", () => {
    expect(pagesUrl("octo/octo.github.io")).toBe("https://octo.github.io/");
  });

  it("returns null when the repository is unknown or malformed", () => {
    expect(pagesUrl(undefined)).toBeNull();
    expect(pagesUrl("")).toBeNull();
    expect(pagesUrl("no-slash")).toBeNull();
    expect(pagesUrl("a/b/c")).toBeNull();
    expect(pagesUrl('a/"><script>')).toBeNull();
  });
});

describe("socialMetaTags", () => {
  it("adds the image and URL only when the site URL is known", () => {
    const known = socialMetaTags("https://x.github.io/panreel/");
    expect(known).toContain('<meta property="og:image" content="https://x.github.io/panreel/social-preview.png" />');
    expect(known).toContain('<meta property="og:url" content="https://x.github.io/panreel/" />');
    expect(known).toContain('content="summary_large_image"');

    const unknown = socialMetaTags(null);
    expect(unknown).not.toContain("og:image");
    expect(unknown).not.toContain("og:url");
    expect(unknown).toContain('<meta name="twitter:card" content="summary" />');
    expect(unknown).toContain('property="og:title"');
  });

  it("escapes attribute values", () => {
    expect(socialMetaTags(null)).not.toMatch(/content="[^"]*</);
  });
});

describe("repoUrl", () => {
  it("links the repository the site is built from", () => {
    expect(repoUrl("someone/panreel")).toBe("https://github.com/someone/panreel");
  });
  it("falls back to the current repository when unknown or malformed", () => {
    expect(repoUrl(undefined)).toBe("https://github.com/konokai68-wq/-1");
    expect(repoUrl("not a repo")).toBe("https://github.com/konokai68-wq/-1");
  });
});
