import { defineConfig } from "@playwright/test";

const PORT = 3100;
// Hosted mode: HOSTED_URL=https://… runs the same suite against a deployed site (no local server).
// Specs that seed the local database or record video can't run there and are left out.
const HOSTED = process.env.HOSTED_URL?.replace(/\/$/, "");

export default defineConfig({
  testDir: "test/e2e",
  testIgnore: HOSTED ? ["receipt-a11y.spec.ts", "video-scenes.spec.ts", "manual-purchase.spec.ts"] : ["hosted.spec.ts"],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: HOSTED ?? `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: HOSTED ? undefined : {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_PATH: ".data/e2e.sqlite",
      APP_BASE_URL: `http://localhost:${PORT}`,
      // The browser suite checks exact interface text and runs axe on it, so by default it uses the
      // deterministic rules text. Live Claude is covered by `npm run test:live`; to drive the
      // interface with live Claude as well, run with E2E_LIVE_AI=1.
      ...(process.env.E2E_LIVE_AI === "1" ? {} : { ANTHROPIC_API_KEY: "" }),
    },
  },
});
