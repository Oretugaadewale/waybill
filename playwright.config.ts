import { defineConfig, devices, type PlaywrightTestProject } from "@playwright/test";

/**
 * End-to-end tests run in two modes.
 *
 * sample (default): builds nothing itself; it starts `next start` on the
 * production build with no database, so the app runs on the bundled sample
 * shipments. Safe to run anywhere, on every push.
 *
 * live: points at a deployed copy (WAYBILL_LIVE_URL) and only reads, unless
 * E2E_ALLOW_WRITES=1 is also set, which turns on the full booking and
 * payment journey in Paystack test mode.
 */
const CI = Boolean(process.env.CI);
const target = process.env.E2E_TARGET === "live" ? "live" : "sample";
const sampleUrl = "http://localhost:3100";
const liveUrl = process.env.WAYBILL_LIVE_URL ?? "https://waybill-dusky.vercel.app";

// Use an installed Chrome when Playwright's own browser is not downloaded.
const chromePath = process.env.PW_CHROME_PATH;
const launch = chromePath ? { launchOptions: { executablePath: chromePath } } : {};

const sampleProjects: PlaywrightTestProject[] = [
  {
    name: "desktop",
    testDir: "e2e/sample",
    use: { ...devices["Desktop Chrome"], ...launch, baseURL: sampleUrl },
  },
  {
    name: "mobile",
    testDir: "e2e/sample",
    grep: /@mobile/,
    use: { ...devices["Pixel 7"], ...launch, baseURL: sampleUrl },
  },
];

const liveProjects: PlaywrightTestProject[] = [
  {
    name: "live",
    testDir: "e2e/live",
    use: { ...devices["Desktop Chrome"], ...launch, baseURL: liveUrl },
  },
];

export default defineConfig({
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  timeout: target === "live" ? 90_000 : 30_000,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-GB",
    timezoneId: "Africa/Lagos",
  },
  projects: target === "live" ? liveProjects : sampleProjects,
  webServer:
    target === "live"
      ? undefined
      : {
          command: "npm run start -- -p 3100",
          url: sampleUrl,
          reuseExistingServer: !CI,
          timeout: 60_000,
        },
});
