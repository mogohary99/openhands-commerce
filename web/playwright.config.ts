import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "test/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_PATH: ".data/e2e.sqlite",
      APP_BASE_URL: `http://localhost:${PORT}`,
    },
  },
});
