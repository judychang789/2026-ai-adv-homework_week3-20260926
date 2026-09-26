const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 180000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    actionTimeout: 20000,
    navigationTimeout: 60000,
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === '1' ? 'chrome' : undefined,

  },
});
