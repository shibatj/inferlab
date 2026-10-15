import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // e2e/ holds Playwright specs, which run against a real browser (npm run test:e2e).
  test: { exclude: ["**/node_modules/**", "e2e/**"] },
  resolve: {
    // Mirror the "@/*" path in tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
