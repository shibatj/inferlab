import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
/** Set to test a deployed site instead, e.g. E2E_BASE_URL=https://inferlab-th.vercel.app */
const REMOTE = process.env.E2E_BASE_URL;

// Runs against the production build: `npm run build` first, then `npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: REMOTE
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}/th`,
        reuseExistingServer: !process.env.CI,
      },
});
