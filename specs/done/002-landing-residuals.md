---
status: implementada
depends_on: [001]
---

# 002 — Residuales de la landing: favicon, claves de Supabase y escenario del header

Tres retoques chicos que salieron al verificar la landing publicada: un favicon pixelado hecho con
la mascota (hoy da 404), el README actualizado a las claves nuevas de Supabase, y que ningún árbol,
flor u hongo del header aparezca cortado en el borde de la pantalla en ningún ancho.

**Tipo**: residuals · **Flujo**: requirements-first

## Estado previo

- Spec 001 implementada y mergeada (PR #1); sitio en <https://nos-vemos-five.vercel.app/>.
- `src/pages/index.astro`: no tiene `<link rel="icon">`. `public/` no tiene favicon:
  `/favicon.ico` y `/favicon.svg` responden 404 en producción (verificado el 2026-10-13).
- `public/sprites/mascot.png`: 16×16, Tiny Dungeon tile 98 (Kenney, CC0).
- `README.md` § Supabase, paso 4: pide la clave **anon public** en **Project Settings → API**.
  § Variables de entorno: `PUBLIC_SUPABASE_ANON_KEY` = "Clave `anon public`".
- Header (`.world` en `index.astro` + `src/styles/global.css`): cada sprite se ubica en
  `left: calc(50% + var(--x) * var(--u))`, con `--u` = 48 px hasta 639 px y 64 px desde 640 px.
  Los sprites `.sp.wide` se ocultan por debajo de 640 px. `.hero` tiene `overflow: hidden`, así que
  no hay scroll pero sí sprites cortados en el borde. Cortes calculados con esas fórmulas:
  - 320 px: flor `town_1` en x=-3.5 (borde izquierdo en -8 px).
  - 880 px: pino `town_4`+`town_16` en x=-7.6 (borde izquierdo en -46 px).
  - 1280 px: flor `town_2` en x=9.5 (borde derecho en 1312 px).
- `evals/run.sh`: 10 chequeos de la spec 001 (C1-C9, C11), todos en verde.

## Qué se construye

1. **Favicon pixelado** derivado de la mascota:
   - `public/favicon.png`: 32×32, la mascota escalada ×2 por vecino más cercano (cada píxel de
     `mascot.png` se vuelve un bloque de 2×2 idéntico, transparencia incluida).
   - `public/favicon.ico`: un ICO que contiene esa misma imagen 32×32 (para navegadores y
     crawlers que piden `/favicon.ico` sin mirar el HTML).
   - En el `<head>`: `<link rel="icon" type="image/png" href="/favicon.png" />`.
   - `scripts/serve-static.mjs` sirve `.ico` como `image/x-icon`.
2. **README con las claves nuevas de Supabase** (verificado contra
   <https://supabase.com/docs/guides/api/api-keys> el 2026-10-13):
   - § Supabase, paso 4: la Project URL y la **publishable key** (`sb_publishable_…`), que se ven
     en el diálogo **Connect** del proyecto o en **Settings → API Keys**. Una línea: es la
     sucesora de la clave `anon` (mismo rol `anon`, segura en el navegador porque RLS limita lo
     que puede hacer); las claves legacy `anon` y `service_role` dejan de existir a fines de 2026.
   - Prohibición explícita: nunca usar la **secret key** (`sb_secret_…`) ni la legacy
     `service_role`, que se saltean RLS.
   - § Variables de entorno: `PUBLIC_SUPABASE_ANON_KEY` = la publishable key `sb_publishable_…`
     (el nombre de la variable no cambia).
   - Ninguna mención a "anon public" como la clave a copiar.
3. **Escenario del header sin cortes**: en todo ancho de 320 a 1920 px, cada sprite de `.world`
   está entero dentro del viewport o no se ve. Solo CSS/markup; la escala `--u` y los colores no
   cambian.
4. **Test Playwright** `tests/e2e/hero-clipping.spec.ts` que lo verifica (ver C14).

## Criterios de aceptación y sus evals

Todos se agregan a `evals/run.sh`, una función por criterio, en una sección `# --- Spec 002`.

| # | Criterio | Eval |
|---|---|---|
| C12 | El favicon existe, es la mascota ×2 y la página lo declara | Tras `npm run build`: `.vercel/output/static/favicon.png` y `favicon.ico` existen; `file` de `favicon.ico` dice `MS Windows icon resource`; el `index.html` construido tiene `<link rel="icon"` con `href="/favicon.png"`. Test Playwright `tests/e2e/favicon.spec.ts`: dibuja `/sprites/mascot.png` y `/favicon.png` en un canvas y comprueba que `favicon.png` mide 32×32 y que cada píxel RGBA (x, y) es igual al de la mascota en (⌊x/2⌋, ⌊y/2⌋) |
| C13 | Cargar la página no produce ningún 404 ni error de consola | Test Playwright `tests/e2e/favicon.spec.ts`: al cargar `/` a 1280×800, ninguna respuesta tiene estado ≥ 400 (incluida la petición a `/favicon.png` y a `/favicon.ico`, que se pide aparte y debe dar 200) y no hay mensajes `console` de tipo `error` |
| C14 | Ningún sprite del header queda cortado por el borde | Test Playwright `tests/e2e/hero-clipping.spec.ts`: para cada ancho en {320, 375, 639, 640, 768, 880, 1024, 1280, 1440, 1920} ∪ {320, 336, 352, …, 1920} (paso 16), con alto 800: para cada `img` dentro de `.world` cuyo `getComputedStyle` no sea `display:none` ni `visibility:hidden`, su `getBoundingClientRect()` cumple `left ≥ 0 && right ≤ ancho` (entero) **o** `right ≤ 0 || left ≥ ancho` (fuera del todo). El test falla listando ancho, `src` y `--x` de cada sprite cortado |
| C15 | El header no pierde escenario donde sobra lugar | En el mismo test: a 1920 px, los 28 `img` de `.world` están visibles y enteros en horizontal (ninguno oculto ni fuera de pantalla); a todo ancho, la mascota, el cofre y la poción están visibles y enteros en horizontal |
| C16 | El README pide la publishable key y prohíbe la secret | `grep` sobre `README.md`: contiene `sb_publishable_`, `sb_secret_`, `service_role` y `API Keys`; la fila de `PUBLIC_SUPABASE_ANON_KEY` en la tabla de variables contiene `sb_publishable_`; **no** contiene `anon public` |
| C1-C11 | Sin regresión de la spec 001 | `evals/run.sh` completo: los 10 chequeos de la 001 siguen en PASS (C8 incluido) |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (Gate 1, 2026-10-13): el favicon sale de la mascota actual (tile 98 de
  Tiny Dungeon, CC0), sin redibujar; cuando exista la mascota propia de Piskel se regenera.
- DECIDIDO por Claudio (Gate 1, 2026-10-13): la variable sigue llamándose
  `PUBLIC_SUPABASE_ANON_KEY` aunque reciba la publishable key: renombrarla obliga a tocar Vercel,
  y el implementador no toca Vercel.
- DECIDIDO por Claudio (Gate 1, 2026-10-13): "ausente" en C14 incluye un sprite entero fuera del
  viewport (el `overflow: hidden` del hero ya lo esconde sin scroll), no solo `display:none`.
- DECIDIDO por Claudio (Gate 1, 2026-10-13): se mantiene la paleta Atardecer pixel (lavanda), la
  escala ×3/×4 y los sprites actuales; sin packs nuevos ni servicios pagos.

### Delegadas al agente, con criterio

- **Cómo se evita el corte** (más cortes de `@media` por sprite, clases por rango de ancho, mover
  algún `--x`): lo más simple que pase C14 y C15, solo CSS/markup, sin JavaScript. Ante empate:
  esconder antes que mover, y la escena lo más simétrica posible respecto de la mascota. Un pino es
  copa + tronco con el mismo `--x`: aparecen y desaparecen juntos.
- **Cómo se genera el favicon**: un script Node sin dependencias nuevas en `scripts/` (o archivos
  versionados generados una vez); lo que sea más simple y reproducible. Si hace falta decodificar
  PNG, se puede usar Playwright, que ya es dependencia.
- **Redacción exacta del README**: español rioplatense, mismo estilo que el resto, sin jerga que
  no esté ya en el README.

### Condiciones de parada (el agente para y pregunta)

- Si algo pide tocar Supabase o Vercel (proyectos, claves, variables, deploys): el sitio está en
  producción con leads reales.
- Si C14 solo se puede cumplir cambiando la escala `--u`, la paleta o sumando sprites/packs.
- Si un chequeo de la spec 001 se rompe y arreglarlo contradice esta spec.
- Si aparece una decisión que ninguna de las dos listas cubre.

## Efectos que escapan del sistema

**Ninguno.** El agente trabaja en una rama de un worktree propio, no pushea, no mergea, no
despliega y no toca Supabase ni Vercel. El favicon y el header llegan a producción cuando Claudio
mergea y Vercel redespliega.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Cambiar en Vercel la clave legacy `anon` por la publishable | Antes de que Supabase desactive las claves legacy (fines de 2026), o si el proyecto de Supabase ya no muestra la clave `anon`. Lo hace Claudio en Vercel + redeploy |
| `apple-touch-icon`, `manifest.webmanifest` | Alguien agrega la landing a la pantalla de inicio o se encara la app (PWA) |
| Favicon con la mascota propia de Piskel | Existe la mascota v1 |
| Cortes verticales de sprites contra el borde inferior del hero | Se ven en una captura a algún ancho |

## Evidencia de implementación

```
PASS C1 el proyecto compila
PASS C2 las tres secciones y el formulario existen
PASS C3 campos del formulario
PASS C4 validación, honeypot, fuente y duplicados (Vitest)
     |       Tests  12 passed (12)
PASS C5 migración: forma y seguridad
PASS C6 sin secretos en el repo
PASS C7 sprites con licencia CC0 (10 sprites, 2 licencias)
PASS C8 375px sin scroll horizontal y botón visible
PASS C9 aviso de privacidad con PUBLIC_CONTACT_EMAIL
PASS C11 README con las cuatro secciones
PASS C12 favicon: mascota x2, ico y <link rel=icon>
PASS C13 la página carga sin 404 ni errores de consola
PASS C14 ningún sprite del header cortado de 320 a 1920 px
PASS C15 28 sprites enteros a 1920 px; mascota, cofre y poción siempre
PASS C16 README pide la publishable key y prohíbe la secret
15 pasan · 0 fallan
```

C8 corre ahora solo `tests/e2e/mobile.spec.ts`; C12-C15 corren cada uno su test (`-g C12`, etc.).
`favicon.png` y `favicon.ico` los genera `scripts/make-favicon.mjs` (sin dependencias).

Comprobación de que C14 detecta el problema: con el CSS anterior falla (320 px: `town_1` en x=-3.5 y el pino
en x=2.6 cortados, entre otros).

Sprites visibles en `.world` (de 28), por ancho:

| Ancho | 320 | 375 | 640 | 880 | 1280 | 1920 |
|---|---|---|---|---|---|---|
| Visibles | 7 | 11 | 13 | 19 | 25 | 28 |

