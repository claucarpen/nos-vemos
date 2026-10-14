import { defineConfig } from 'vitest/config';

// `npm run test:db`: tests contra un Postgres embebido; cada archivo levanta su propio cluster.
export default defineConfig({
  test: { include: ['tests/db/**/*.test.ts'], testTimeout: 30_000, hookTimeout: 120_000 },
});
