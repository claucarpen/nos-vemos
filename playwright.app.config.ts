import { defineConfig } from '@playwright/test';

// Tests de la app (spec 003, C5): `astro dev` con variables de Supabase falsas que apuntan a un stub local.
// Sin claves reales ni red: el stub contesta que ninguna juntada existe. `--ignore-lock` deja `astro dev`
// en primer plano (Astro 7 lo pasa a segundo plano si detecta un agente, y Playwright no podría cerrarlo).
const STUB = 54329;
const APP = 4322;

export default defineConfig({
  testDir: 'tests/app',
  webServer: [
    { command: `node tests/app/stub-supabase.mjs`, url: `http://127.0.0.1:${STUB}/salud`, env: { STUB_PORT: String(STUB) }, reuseExistingServer: false },
    {
      command: `npx astro dev --port ${APP} --host 127.0.0.1 --ignore-lock`,
      url: `http://127.0.0.1:${APP}/nueva`,
      env: { PUBLIC_SUPABASE_URL: `http://127.0.0.1:${STUB}`, PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_falsa_para_tests' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  use: { baseURL: `http://127.0.0.1:${APP}` },
});
