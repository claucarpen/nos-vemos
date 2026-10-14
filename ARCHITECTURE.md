# nos-vemos — Arquitectura (as-built)

> Describe lo construido, nunca lo planeado — lo que falta vive en `specs/`.

## Stack

- Astro 7 con `@astrojs/vercel`; React solo para la isla del formulario.
- `/` se prerenderiza (`.vercel/output/static/index.html`); `saveLead` corre en el servidor.
- Supabase: tabla `leads` con RLS; el rol `anon` solo puede insertar.

## Mapa

| Ruta | Qué es |
|---|---|
| `src/pages/index.astro` | Landing: hero (header a todo el ancho: `.hero-text` y `.world` con sprites posicionados en unidades de tile desde el centro), `#problema`, `#solucion`, `#form-leads`, aviso de privacidad |
| `src/components/LeadForm.tsx` | Isla React: formulario, honeypot `empresa`, `utm_source` leído de la URL |
| `src/actions/index.ts` | Action `saveLead`: arma el cliente de Supabase y llama a `processLead` |
| `src/lib/leads.ts` | Lógica pura (validación, honeypot, `fuente`, duplicados) con cliente inyectable |
| `src/lib/leads.test.ts` | Vitest con cliente falso |
| `src/styles/global.css` | Estilos retro y paleta "Atardecer pixel" (índigo, un acento lavanda; el cielo del hero en bandas planas) |
| `supabase/migrations/001_leads.sql` | Tabla `leads` y política de insert para `anon` |
| `public/sprites/` | Sprites Tiny Dungeon (`chest`, `potion`, `mascot`) y Tiny Town (`town_*`: pasto, tierra, árboles), Kenney CC0, con `License-tiny-dungeon.txt` y `License-tiny-town.txt` |
| `public/favicon.png`, `public/favicon.ico` | Favicon: la mascota ×2 por vecino más cercano (32×32); el `.ico` envuelve ese mismo PNG. Se regeneran con `node scripts/make-favicon.mjs`; `index.astro` declara `<link rel="icon" href="/favicon.png">` |
| `public/fonts/` | Press Start 2P (OFL) y su licencia |
| `scripts/serve-static.mjs`, `tests/e2e/` | Servidor estático (sirve `.ico` como `image/x-icon`) y tests Playwright: `mobile.spec.ts` (375 px), `favicon.spec.ts` (favicon y sin 404/errores de consola), `hero-clipping.spec.ts` (ningún sprite cortado de 320 a 1920 px) |

## Escenario del hero

Cada sprite de `.world` se ubica con `--x` (unidades de tile desde el centro) y `--u` (48 px hasta 639 px, 64 px desde 640 px). Un sprite se muestra solo si entra entero en el viewport: su clase `wN` en `index.astro` es el ancho mínimo, y `global.css` lo activa con `@media (min-width: Npx)`. Sin clase, siempre visible. El par izquierdo/derecho comparte clase, y la copa y el tronco de un pino también. Regla del ancho mínimo: `ceil(2 × --u × (|--x| + 1 del lado derecho del par)) + 16` (los 16 px son margen por la barra de scroll). Al sumar un sprite: ponerle la clase `wN` de su tier o crear el tier; `hero-clipping.spec.ts` lo verifica.

## Variables de entorno

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (recibe la publishable key `sb_publishable_…`), `PUBLIC_CONTACT_EMAIL` (ver `.env.example`). Se inlinean al construir.

## Comandos

```
npm run build
npm test
npm run test:e2e
evals/run.sh
```
