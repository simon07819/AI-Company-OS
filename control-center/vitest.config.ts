// @ts-nocheck
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.tsx"],
    css: false,
    exclude: ["node_modules/**", "dist/**", ".next/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  oxc: false,
});
