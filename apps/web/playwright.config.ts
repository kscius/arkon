import { defineConfig, devices } from '@playwright/test';

/**
 * E2E expects a running stack with seeded users:
 * - Docker: `docker compose up -d` → http://localhost:8080 (nginx proxies /api)
 * - Dev: API on :8000, `pnpm dev:web` on :3000 → set PLAYWRIGHT_BASE_URL=http://localhost:3000
 *
 * Tests skip automatically when /api/health is unreachable.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer: start `docker compose up -d` or dev servers before `pnpm test:e2e`.
  // Tests call skipIfApiDown() when /api/health is unreachable.
});
