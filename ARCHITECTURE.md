# nos-vemos — Arquitectura (as-built)

> Describe lo construido, nunca lo planeado — lo que falta vive en `specs/`.

## Stack

- Astro 7 con `@astrojs/vercel`; React solo para la isla del formulario.
- `/` se prerenderiza (`.vercel/output/static/index.html`); `saveLead` corre en el servidor.
- Supabase: tabla `leads` con RLS; el rol `anon` solo puede insertar.

## Mapa

| Ruta | Qué es |
|---|---|
| `src/pages/index.astro` | Landing: hero, `#problema`, `#solucion`, `#form-leads`, aviso de privacidad |
| `src/components/LeadForm.tsx` | Isla React: formulario, honeypot `empresa`, `utm_source` leído de la URL |
| `src/actions/index.ts` | Action `saveLead`: arma el cliente de Supabase y llama a `processLead` |
| `src/lib/leads.ts` | Lógica pura (validación, honeypot, `fuente`, duplicados) con cliente inyectable |
| `src/lib/leads.test.ts` | Vitest con cliente falso |
| `src/styles/global.css` | Estilos retro y paleta "RPG clásico" (bosque, madera, oro) |
| `supabase/migrations/001_leads.sql` | Tabla `leads` y política de insert para `anon` |
| `public/sprites/` | Sprites Tiny Dungeon (`chest`, `potion`, `mascot`) y Tiny Town (`town_*`: pasto, camino, árboles), Kenney CC0, con `License-tiny-dungeon.txt` y `License-tiny-town.txt` |
| `public/fonts/` | Press Start 2P (OFL) y su licencia |
| `scripts/serve-static.mjs`, `tests/e2e/` | Servidor estático y test Playwright de 375 px |

## Variables de entorno

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_CONTACT_EMAIL` (ver `.env.example`). Se inlinean al construir.

## Comandos

```
npm run build
npm test
npm run test:e2e
evals/run.sh
```
