import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://localhost:4321' },
});
