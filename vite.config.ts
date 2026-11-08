import { defineConfig } from "vitest/config";
import { pagesUrl, socialMetaTags } from "./src/siteMeta";

// Relative base so the build works on GitHub Pages under any repository name.
// In GitHub Actions, GITHUB_REPOSITORY gives the absolute URL that link previews need.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "panreel-social-meta",
      transformIndexHtml(html) {
        const tags = socialMetaTags(pagesUrl(env.GITHUB_REPOSITORY));
        return html.replace("<!-- social-meta -->", tags);
      },
    },
  ],
  test: {
    environment: "node",
  },
});
