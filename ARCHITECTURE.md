# nos-vemos — Arquitectura (as-built)

> Describe lo construido, nunca lo planeado — lo que falta vive en `specs/`.

## Stack

- Astro 7 con `@astrojs/vercel`; React solo para las islas `LeadForm` y `CrearJuntadaForm`.
- `/` se prerenderiza (`.vercel/output/static/index.html`); `saveLead` corre en el servidor.
- `/nueva`, `/j/[codigo]` y `/auth/*` se renderizan en el servidor (`prerender = false`). La landing enlaza solo a `/nueva` (botón del header); ningún `href` a `/j/` (eval `003·C1`).
- Auth: Supabase Auth con Google vía `@supabase/ssr`; la sesión viaja en cookies (PKCE).
- Supabase: tabla `leads` con RLS (`anon` solo inserta). Tablas de la v1 con RLS y sin acceso directo: todo pasa por funciones `security definer`.

## Mapa

| Ruta | Qué es |
|---|---|
| `src/pages/index.astro` | Landing: hero (header a todo el ancho: `.hero-text` con el botón "Creá tu juntada" → `/nueva`, y `.world` con sprites posicionados en unidades de tile desde el centro), `#problema`, `#solucion`, `#form-leads` ("¿Todavía no?", la segunda opción), aviso de privacidad |
| `src/components/LeadForm.tsx` | Isla React: formulario, honeypot `empresa`, `utm_source` leído de la URL |
| `src/actions/index.ts` | Action `saveLead`: arma el cliente de Supabase y llama a `processLead` |
| `src/lib/leads.ts` | Lógica pura (validación, honeypot, `fuente`, duplicados) con cliente inyectable |
| `src/lib/leads.test.ts` | Vitest con cliente falso |
| `src/styles/global.css` | Estilos retro y paleta "Atardecer pixel" (índigo, un acento lavanda; el cielo del hero en bandas planas) |
| `supabase/migrations/001_leads.sql` | Tabla `leads` y política de insert para `anon` |
| `supabase/migrations/002_juntadas.sql` | v1: 7 tablas, 7 funciones, vista `metricas_experimento` (ver "Base de la v1") |
| `src/pages/nueva.astro` | Crear juntada. Sin sesión: "Entrar con Google". POST → `crear_juntada` → 303 a `/j/<código>` |
| `src/pages/j/[codigo].astro` | La juntada. Sin sesión: `juntada_publica`. Con sesión: `detalle_juntada` (si no es participante, `unirse` primero). POST `accion=votar\|cancelar` → 303. 404 si no existe, 503 si la base falla |
| `src/pages/auth/login.ts`, `src/pages/auth/callback.ts` | POST que arranca el OAuth de Google; callback que canjea el código, llama a `asegurar_perfil` y vuelve a `next` (solo rutas internas) |
| `src/pages/privacidad.astro`, `src/styles/privacidad.css` | Política de privacidad, prerenderizada, indexable (sin `noindex`), 8 secciones con `id`; el contacto sale de `PUBLIC_CONTACT_EMAIL`. Enlazada desde el aviso y el footer de la landing, `EntrarConGoogle.astro` (prop `aviso`) y `JuntadaPublica.astro` |
| `src/layouts/App.astro` | Layout de la app: barra con la mascota y el link "¿Qué es Nos Vemos?" → `/` (único, en el layout), `global.css` + `app.css`, `noindex` |
| `src/components/app/` | `Juntada.astro` (votar / LEVEL CLEAR / GAME OVER), `JuntadaPublica.astro`, `EntrarConGoogle.astro`, isla `CrearJuntadaForm.tsx` (filas de fecha 2-10) |
| `src/lib/supabase.ts` | Cliente SSR (`createServerClient` con las cookies de Astro) y `rutaSegura` |
| `src/lib/fechas.ts`, `src/lib/whatsapp.ts`, `src/lib/codigo.ts`, `src/lib/errores.ts`, `src/lib/juntada.ts` | Hora argentina (formato y `datetime-local` → UTC), links `wa.me`, forma del código, traducción de errores de la base, tipos del detalle |
| `src/lib/juntadas.test.ts` | Vitest de fechas, WhatsApp, código y errores |
| `src/styles/app.css` | Estilos de la app con la paleta Atardecer pixel (sin tocar `global.css`) |
| `src/dev/vista-previa.astro` | Vista previa de diseño con datos de ejemplo; la integración de `astro.config.mjs` la inyecta en `/vista-previa/[pantalla]` solo en `astro dev` |
| `tests/db/` | `npm run test:db`: `pg.ts` levanta `embedded-postgres` con `supabase-shim.sql`; `shim.test.ts` (paso 0) y `juntadas.test.ts` (reglas y seguridad) |
| `tests/app/`, `playwright.app.config.ts` | Playwright de la app sin sesión contra `astro dev --ignore-lock` y `stub-supabase.mjs` (Supabase falso: ninguna juntada existe) |
| `public/sprites/` | Sprites Tiny Dungeon (`chest`, `potion`, `mascot`) y Tiny Town (`town_*`: pasto, tierra, árboles), Kenney CC0, con `License-tiny-dungeon.txt` y `License-tiny-town.txt` |
| `public/favicon.png`, `public/favicon.ico` | Favicon: la mascota ×2 por vecino más cercano (32×32); el `.ico` envuelve ese mismo PNG. Se regeneran con `node scripts/make-favicon.mjs`; `index.astro` declara `<link rel="icon" href="/favicon.png">` |
| `public/fonts/` | Press Start 2P (OFL) y su licencia |
| `scripts/serve-static.mjs`, `tests/e2e/` | Servidor estático (sirve `.ico` como `image/x-icon` y `/ruta` como `ruta/index.html`, como Vercel) y tests Playwright: `mobile.spec.ts` (375 px), `privacidad.spec.ts` (`/privacidad` a 375 px, carga limpia), `favicon.spec.ts` (favicon y sin 404/errores de consola), `hero-clipping.spec.ts` (ningún sprite cortado de 320 a 1920 px) |

## Escenario del hero

Cada sprite de `.world` se ubica con `--x` (unidades de tile desde el centro) y `--u` (48 px hasta 639 px, 64 px desde 640 px). Un sprite se muestra solo si entra entero en el viewport: su clase `wN` en `index.astro` es el ancho mínimo, y `global.css` lo activa con `@media (min-width: Npx)`. Sin clase, siempre visible. El par izquierdo/derecho comparte clase, y la copa y el tronco de un pino también. Regla del ancho mínimo: `ceil(2 × --u × (|--x| + 1 del lado derecho del par)) + 16` (los 16 px son margen por la barra de scroll). Al sumar un sprite: ponerle la clase `wN` de su tier o crear el tier; `hero-clipping.spec.ts` lo verifica.

## Base de la v1

Tablas (RLS y `revoke all` para `anon` y `authenticated`): `tipos_evento`, `perfiles`, `juntadas`, `opciones`, `participantes`, `disponibilidad`, `movimientos`. Única política: `authenticated` lee su propia fila de `perfiles`.

| Función | Ejecuta | Errores que lanza |
|---|---|---|
| `asegurar_perfil()` | authenticated | `sin_sesion` |
| `crear_juntada(titulo, quorum, tamano_grupo, inicios)` → código | authenticated | `titulo_invalido`, `tamano_invalido`, `quorum_invalido`, `cantidad_opciones`, `opcion_pasada`, `opciones_repetidas` |
| `juntada_publica(codigo)` → título, organizador, estado | anon, authenticated | — (0 filas si no existe) |
| `unirse(codigo)` | authenticated | `no_existe`, `juntada_no_abierta`, `juntada_llena` |
| `detalle_juntada(codigo)` → jsonb | authenticated participante | `no_existe`, `no_participante` |
| `votar(codigo, opciones_ids)` → estado | authenticated participante | `no_existe`, `no_participante`, `juntada_no_abierta`, `opcion_ajena` |
| `cancelar(codigo)` | authenticated organizador | `no_existe`, `no_organizador`, `juntada_no_abierta` |

`metricas_experimento` (`security_invoker`, sin acceso para `anon` ni `authenticated`): `codigo`, `titulo`, `creada_en`, `tamano_grupo`, `votantes`, `tasa_voto`, `estado`, `horas_hasta_cierre`. Votante = tiene al menos un movimiento `voto`. Borrar una fila de `juntadas` borra en cascada opciones, participantes, disponibilidad y movimientos.

## Variables de entorno

`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (recibe la publishable key `sb_publishable_…`), `PUBLIC_CONTACT_EMAIL` (ver `.env.example`). Se inlinean al construir. La v1 usa las mismas; el Client secret de Google vive solo en el panel de Supabase.

## Comandos

```
npm run build
npm test                                   # Vitest de src/
npm run test:db                            # Vitest contra Postgres embebido (sin Docker)
npm run test:e2e                           # Playwright de la landing contra el build estático
npx playwright test -c playwright.app.config.ts   # Playwright de la app sin sesión
evals/run.sh
```
