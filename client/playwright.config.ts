import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 * Тестує ключові user flows через реальний браузер
 */
export default defineConfig({
  testDir: './e2e',

  // Максимальний час на один тест
  timeout: 30 * 1000,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    // Base URL для всіх тестів
    baseURL: 'http://localhost:5173',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Projects для різних браузерів
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web Server - автоматично запустить dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
