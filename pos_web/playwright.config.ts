import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = 3101;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${String(E2E_PORT)}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --hostname=127.0.0.1 --port=${String(E2E_PORT)}`,
    port: E2E_PORT,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
