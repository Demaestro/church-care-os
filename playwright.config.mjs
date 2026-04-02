import path from "node:path";
import { defineConfig } from "@playwright/test";

const port = 3105;
const baseURL = `http://127.0.0.1:${port}`;
const runId = `${Date.now()}`;
const e2eDbPath = path.join(process.cwd(), "tests", "support", `e2e-care-${runId}.db`);
const e2eUploadsPath = path.join(
  process.cwd(),
  "tests",
  "support",
  `e2e-uploads-${runId}`
);

process.env.PLAYWRIGHT_E2E_DB_PATH = e2eDbPath;
process.env.PLAYWRIGHT_E2E_UPLOADS_PATH = e2eUploadsPath;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.mjs",
  use: {
    baseURL,
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node .next/standalone/server.js",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      AUTH_SECRET: "playwright-secret",
      APP_BASE_URL: baseURL,
      CARE_SEED_DEMO_USERS: "1",
      CARE_DB_PATH: e2eDbPath,
      CARE_UPLOADS_PATH: e2eUploadsPath,
    },
  },
});
