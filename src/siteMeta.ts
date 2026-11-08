// Social-card <meta> tags for index.html, built at compile time (see vite.config.ts).
// Link previews need absolute URLs, so the image and page URL are only added when
// the build knows where the site will live (GITHUB_REPOSITORY in GitHub Actions).

export const SITE_TITLE = "Panreel — polish screen recordings in your browser";
export const SITE_DESCRIPTION =
  "Turn raw screen recordings into polished demo videos: backdrops, smooth zooms, cuts, speed-ups and callouts. Free, open source, and nothing leaves your browser.";
export const SOCIAL_IMAGE = "social-preview.png";
export const SOCIAL_IMAGE_ALT =
  "Panreel: a screen recording on a gradient backdrop with a zoom, a speed-up and a text callout with an arrow";

/**
 * GitHub Pages URL (with a trailing slash) for "owner/repo", or null if unknown.
 * A repo named "<owner>.github.io" is served from the domain root.
 */
export function pagesUrl(repository: string | undefined): string | null {
  const m = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(repository?.trim() ?? "");
  if (!m) return null;
  const owner = m[1].toLowerCase();
  const repo = m[2];
  if (repo.toLowerCase() === `${owner}.github.io`) return `https://${owner}.github.io/`;
  return `https://${owner}.github.io/${repo}/`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The <meta> tags to put in <head>, one per line. */
export function socialMetaTags(siteUrl: string | null): string {
  const tags: [string, string, string][] = [
    ["property", "og:type", "website"],
    ["property", "og:site_name", "Panreel"],
    ["property", "og:title", SITE_TITLE],
    ["property", "og:description", SITE_DESCRIPTION],
    ["name", "twitter:title", SITE_TITLE],
    ["name", "twitter:description", SITE_DESCRIPTION],
  ];
  if (siteUrl) {
    const image = siteUrl + SOCIAL_IMAGE;
    tags.push(
      ["property", "og:url", siteUrl],
      ["property", "og:image", image],
      ["property", "og:image:width", "1280"],
      ["property", "og:image:height", "640"],
      ["property", "og:image:alt", SOCIAL_IMAGE_ALT],
      ["name", "twitter:card", "summary_large_image"],
      ["name", "twitter:image", image],
    );
  } else {
    tags.push(["name", "twitter:card", "summary"]);
  }
  return tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}" />`).join("\n    ");
}
