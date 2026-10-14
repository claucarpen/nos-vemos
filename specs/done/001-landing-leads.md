---
status: implementada
depends_on: []
---

# 001 — Landing de Nos Vemos con captura de leads

Construir la landing de Nos Vemos: una página retro gaming pixelada que cuenta el problema, presenta
la solución y tiene un formulario donde la gente deja nombre y email. Los leads se guardan en una
tabla de Supabase que el público solo puede llenar, nunca leer.

**Tipo**: feature · **Flujo**: requirements-first

## Contexto

- Producto: Nos Vemos, un portal que organiza juntadas de amigos: junta la disponibilidad, insiste
  con los que no contestan, cierra la juntada sola al llegar al quórum y la repite cada mes.
- Usuario al que le habla la landing: el organizador del grupo, adulto de 35-50 que hoy coordina por
  WhatsApp y ve cómo la juntada se cae.
- Objetivo de la landing: validar que a otros grupos les pasa lo mismo y medir qué canal trae
  interesados (`fuente`).

## Estado previo

Repo recién nacido desde la plantilla: `CLAUDE.md`, `ARCHITECTURE.md` vacío, `decisions.md`,
`evals/run.sh` sin chequeos, `specs/done/`. No hay código, ni proyecto Astro, ni `package.json`.

## Qué se construye

1. **Proyecto Astro** con el adaptador oficial de Vercel (`@astrojs/vercel`) y React para islas
   interactivas. La página `/` se prerenderiza; el envío del formulario corre en el servidor
   (Astro Action).
2. **La landing**, en este orden:
   - **Hero**: logo pixelado "Nos Vemos", mascota, bajada "Press Start para la próxima juntada".
   - **Problema** (`id="problema"`): la juntada que nunca se concreta: el chat que no cierra, el
     jueves sin fecha, los que nunca contestan.
   - **Solución** (`id="solucion"`): las cuatro promesas: cierre automático por quórum, recordatorios
     con fecha límite, juntadas recurrentes, medallas/puntos/ranking.
   - **Formulario** (`id="form-leads"`): nombre, email, botón; aviso de privacidad debajo.
3. **Envío del formulario** (Astro Action `saveLead`):
   - Valida: `nombre` 1-80 caracteres sin espacios sobrantes; `email` con formato válido,
     normalizado a minúsculas.
   - Campo trampa (honeypot) invisible: si viene con valor, responde éxito y no guarda nada.
   - `fuente`: tomada de `utm_source` de la URL; minúsculas, solo `[a-z0-9_-]`, máximo 50
     caracteres; si falta o es inválida, `directo`.
   - Email ya registrado: responde éxito con el mensaje "¡Ya estabas en la lista!", sin error.
   - Mensajes en clave retro: éxito "¡PLAYER JOINED! Te avisamos cuando arranque." · error
     "GAME OVER… algo falló. Probá de nuevo."
4. **Base de datos**: `supabase/migrations/001_leads.sql`:
   - Tabla `leads`: `id uuid` PK default `gen_random_uuid()`, `nombre text not null`,
     `email text not null unique`, `fuente text not null default 'directo'`,
     `creado_en timestamptz not null default now()`.
   - Row Level Security activado; una única política para el rol `anon`: `insert`. Ninguna política
     de `select`, `update` ni `delete` para `anon`.
5. **Configuración por variables de entorno** (`.env.example`, nunca `.env` en el repo):
   `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_CONTACT_EMAIL`.
6. **Estética retro**: tipografía pixel con licencia libre (OFL o similar), estilos retro, sprites
   de un pack de Kenney (CC0) en `public/sprites/`, con el archivo de licencia del pack copiado ahí.
   Mascota v0: un personaje del pack con colores propios de Nos Vemos (el operador la refina después
   en Piskel). Una sola resolución y paleta en todos los sprites.
7. **`README.md`** con los pasos del operador: crear el proyecto en Supabase, correr la migración,
   cargar las variables en Vercel, desplegar, y el checklist previo a publicar.

## Criterios de aceptación y sus evals

Todos los deterministas se agregan a `evals/run.sh`, una función por criterio.

| # | Criterio | Eval |
|---|---|---|
| C1 | El proyecto compila | `npm ci && npm run build` sale con código 0 |
| C2 | La página construida tiene las tres secciones y el formulario | En el `index.html` construido: existen `id="problema"`, `id="solucion"`, `id="form-leads"` |
| C3 | El formulario tiene los campos correctos | En el `index.html` construido: input `name="nombre"` con `required`; input `type="email"` `name="email"` con `required`; un campo honeypot oculto a la vista y a lectores de pantalla (`aria-hidden="true"`, `tabindex="-1"`) |
| C4 | Validación, honeypot, fuente y duplicados funcionan | `npm test` (Vitest) pasa con, como mínimo, estos casos sobre la lógica de `saveLead` con un cliente de Supabase falso: nombre vacío → rechazo · email inválido → rechazo · email con mayúsculas → se guarda en minúsculas · honeypot con valor → éxito sin insertar · `utm_source=WhatsApp` → `whatsapp` · `utm_source` ausente → `directo` · `utm_source` con caracteres inválidos → `directo` · email duplicado (error `23505`) → éxito con "¡Ya estabas en la lista!" |
| C5 | La tabla tiene la forma y la seguridad pedidas | `grep` sobre `supabase/migrations/001_leads.sql`: las cinco columnas con sus tipos; `unique` en `email`; `default 'directo'`; `enable row level security`; exactamente una `create policy` y es `for insert` `to anon`; ninguna policy `for select` |
| C6 | No hay secretos en el repo | `git ls-files` no incluye `.env`; `.gitignore` contiene `.env`; `grep -ri "service_role"` en el código fuente devuelve 0 resultados; `.env.example` tiene las tres variables sin valores reales |
| C7 | Sprites con licencia | Existe `public/sprites/` con al menos un sprite y un archivo de licencia que contiene `CC0` |
| C8 | Se ve bien en celular | Script Playwright: a 375×812 px, `document.documentElement.scrollWidth <= 375` y el botón del formulario es visible sin hacer zoom |
| C9 | El aviso de privacidad está y usa la variable | En el `index.html` construido aparece el texto de privacidad; el email de contacto sale de `PUBLIC_CONTACT_EMAIL` (`grep` en el fuente; ningún email escrito a mano) |
| C10 | La estética y los textos cumplen la identidad | Rúbrica (abajo), evaluada sobre capturas a 375 px y 1280 px adjuntas al PR |
| C11 | El operador puede ponerla en marcha solo | `README.md` tiene las secciones: Supabase, Variables de entorno, Deploy en Vercel, Checklist antes de publicar |

### Rúbrica de C10 (pasa si cumple todo)

1. Tipografía pixel en títulos; el texto largo y el formulario se leen sin esfuerzo.
2. Mascota y al menos un ambiente pixelado de Kenney visibles en el hero.
3. Aparecen "Press Start para la próxima juntada" y los mensajes "PLAYER JOINED" / "GAME OVER".
4. Español rioplatense (vos) en todos los textos.
5. Claridad sobre lo retro: alguien no gamer entiende en dos segundos qué hay que completar y
   dónde apretar. El botón tiene contraste suficiente (WCAG AA).
6. Las cuatro promesas de la Solución están, en lenguaje de usuario, sin jerga técnica.

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-11): leads en Supabase, no Google Apps Script, porque la tabla nace
  en la base que usará el producto y no habrá migración.
- DECIDIDO por Claudio (2026-10-13): frontend en Astro (no Next.js), desplegado en Vercel.
- DECIDIDO por Claudio (2026-10-13): estética retro gaming pixelada; sprites de Kenney (CC0) y
  mascota propia; sin herramientas pagas.
- DECIDIDO por Claudio (2026-10-11): el formulario pide solo nombre y email; `fuente` sale del link.
- DECIDIDO por Claudio (2026-10-13): hasta verificar el dominio propio, se publica en la dirección
  gratuita de Vercel.

### Delegadas al agente, con criterio

- **Qué pack de Kenney**: licencia CC0, trae personajes y escenarios, una sola resolución (16×16 o
  32×32). Ante empate, el de estética más "arcade 80-90".
- **Qué tipografía pixel**: licencia libre (OFL o similar), legible a 16 px, con acentos y ñ.
- **Cómo se divide en componentes**: lo más simple que pase los evals; React solo donde haya
  interactividad real (el formulario).
- **Paleta**: la del pack elegido; el botón del formulario debe cumplir contraste WCAG AA.

### Condiciones de parada (el agente para y pregunta)

- **Antes de integrar el pack de Kenney y la mascota v0**: muestra el pack elegido y la mascota al
  operador y espera su ok.
- Si algo requiere un servicio pago, una cuenta nueva o claves reales.
- Si la estética retro y la claridad (rúbrica punto 5) chocan y no hay forma de cumplir las dos.
- Si un criterio contradice a otro, o aparece una decisión que ninguna de las dos listas cubre.

## Efectos que escapan del sistema

**Ninguno durante la implementación.** El agente no crea proyectos en Supabase ni Vercel, no
despliega, no publica y no conoce claves reales: los tests usan un cliente de Supabase falso. El
despliegue y la recepción de leads reales son actos del operador, siguiendo el `README.md`, y
recién después de que exista el email de contacto (`PUBLIC_CONTACT_EMAIL`).

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| La app (crear juntada, votar, registro) | La landing junta 30 leads o más |
| Captcha (Cloudflare Turnstile) | Llegan más de 5 leads basura en una semana |
| Pregunta opcional "¿qué te sirve más?" | Se superan 30 leads y hay que decidir qué adelantar (v2, v3 o v4) |
| Dominio propio | Claudio verifica el dominio y la marca |
| Analítica de visitas | La landing está publicada y se empieza a difundir |
| Animaciones de sprites | La rúbrica C10 pasa y queda tiempo, en una spec aparte |

## Evidencia de implementación

Comando: `evals/run.sh` (2026-10-13, tras la enmienda del hero a todo el ancho).

```
PASS C1 el proyecto compila
PASS C2 las tres secciones y el formulario existen
PASS C3 campos del formulario
PASS C4 validación, honeypot, fuente y duplicados (Vitest)
     |       Tests  12 passed (12)
PASS C5 migración: forma y seguridad
PASS C6 sin secretos en el repo
PASS C7 sprites con licencia CC0 (11 sprites, 2 licencias)
PASS C8 375px sin scroll horizontal y botón visible
PASS C9 aviso de privacidad con PUBLIC_CONTACT_EMAIL
PASS C11 README con las cuatro secciones
10 pasan · 0 fallan
```

### Contrastes WCAG (paleta Atardecer pixel)

| Par | Ratio | Mínimo |
|---|---|---|
| Texto del botón #1e1b3a sobre lavanda #c4b5fd | 8.94 | 4.5 |
| Títulos #edf2f7 sobre fondo #1e1b3a | 14.65 | 4.5 |
| Texto #cbd5e0 sobre panel #2c2950 | 9.18 | 4.5 |
| Texto #cbd5e0 sobre fondo | 11.10 | 4.5 |
| Tagline #f6b8c8 sobre fondo | 9.90 | 4.5 |
| h3, etiquetas y enlaces lavanda sobre panel | 7.39 | 4.5 |
| Texto atenuado #a0aec0 (privacidad) sobre panel | 6.05 | 4.5 |
| Texto atenuado #a0aec0 (pie) sobre fondo | 7.31 | 4.5 |
| Mensaje de éxito #f6b8c8 sobre panel | 8.19 | 4.5 |
| Texto del input #edf2f7 sobre #16142b | 15.95 | 4.5 |
| Borde del input #8b84b8 sobre panel | 3.95 | 3 |
| Borde del input #8b84b8 sobre fondo del input | 5.21 | 3 |
| Foco lavanda sobre panel | 7.39 | 3 |

Ajuste: el borde #4a4672 pedido para los inputs daba 1.56 contra el panel; se usó #8b84b8. #4a4672 queda solo en los bordes de panel, que son decorativos.

### Contrastes del texto del hero (header a todo el ancho)

| Par | Ratio | Mínimo |
|---|---|---|
| Título #edf2f7 sobre #2d2a5a | 11.72 | 4.5 |
| Título #edf2f7 sobre #4a3a7e | 8.48 | 4.5 |
| Tagline #f6b8c8 sobre #2d2a5a | 7.93 | 4.5 |
| Tagline #f6b8c8 sobre #4a3a7e | 5.74 | 4.5 |
| Botón #1e1b3a sobre lavanda | 8.94 | 4.5 |

Medido en Playwright: a 375 px el hero mide 407 px de 812 (50 %) y `scrollWidth` es 375; a 1280 px el hero mide 464 px y `scrollWidth` es 1280. Los demás contrastes de la tabla anterior no cambiaron.

### C10 (rúbrica), sobre capturas a 375 y 1280 px

Capturas: `landing_375.png` y `landing_1280.png` (adjuntar al PR).

1. Tipografía pixel en títulos; texto largo legible: PASA. Press Start 2P en h1/h2/etiquetas/botón; párrafos en fuente del sistema a 17 px.
2. Mascota y ambiente de Kenney en el hero: PASA. Header a todo el ancho con cielo de atardecer en bandas planas, murciélagos de Tiny Dungeon, suelo de Tiny Town con árboles, flores y hongos, y la mascota original centrada en el camino con cofre y poción.
3. Textos obligatorios: PASA. "Press Start para la próxima juntada" visible en el hero; "PLAYER JOINED" y "GAME OVER" están en `src/lib/leads.ts` y los cubren los tests de C4 (no vistos en captura).
4. Español rioplatense: PASA ("Anotame", "Sumate", "dejanos", "querés", "vos").
5. Claridad y contraste: PASA. Dos campos con etiquetas y un botón lavanda "Press Start" con contraste 8.94 (ver tabla).
6. Cuatro promesas sin jerga: PASA. "Cierra solo", "Insiste por vos", "Se repite", "Con premios".

Pendiente fuera de los evals: el operador prueba el envío real tras Supabase y Vercel (README).
