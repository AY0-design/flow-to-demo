import { defineConfig } from "@playwright/test";
import flow from "./flow.json" with { type: "json" };
// @ts-expect-error plain JS helper
import { findChrome } from "./tools/browser.mjs";

const { width, height } = flow.meta.viewport;
const executablePath: string | undefined = process.env.FLOW_USE_BUNDLED ? undefined : findChrome();

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "qa/playwright-results.json" }]],
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width, height },
    deviceScaleFactor: 2,
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npx vite build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
