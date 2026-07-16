import { defineConfig, devices } from '@playwright/test';

const frontendUrl = 'http://127.0.0.1:5173';
const backendUrl = 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node --import ./backend/dist/instrument.js backend/dist/index.js',
      url: `${backendUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: '3001',
        HOST: '127.0.0.1',
        FRONTEND_URL: frontendUrl,
        MOCK_SCORE_RESUME: 'true',
        SCORE_RATE_LIMIT_MAX: '1000',
      },
    },
    {
      command: 'yarn dev --host 127.0.0.1 --port 5173',
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_E2E_MODE: 'true',
        VITE_API_BASE_URL: backendUrl,
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
