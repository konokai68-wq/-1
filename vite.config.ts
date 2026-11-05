import { defineConfig } from "vitest/config";

// Relative base so the build works on GitHub Pages under any repository name.
export default defineConfig({
  base: "./",
  test: {
    environment: "node",
  },
});
