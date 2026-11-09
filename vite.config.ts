import { defineConfig } from "vitest/config";
import { DEFAULT_REPOSITORY, pagesUrl, repoUrl, socialMetaTags } from "./src/siteMeta";

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
        return html
          .replace("<!-- social-meta -->", tags)
          .replace(`href="https://github.com/${DEFAULT_REPOSITORY}"`, `href="${repoUrl(env.GITHUB_REPOSITORY)}"`);
      },
    },
  ],
  test: {
    environment: "node",
  },
});
