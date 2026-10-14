import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// La página `/` se prerenderiza (default de Astro); `saveLead` corre en el servidor (Vercel).
export default defineConfig({
  adapter: vercel(),
  integrations: [react()],
});
