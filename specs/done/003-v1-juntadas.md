---
status: implementada
depends_on: [001, 002]
---

# 003 — v1 de Nos Vemos: crear juntada, votar y cierre automático por quórum

Construir la primera versión del producto. Un organizador crea una juntada con varias opciones de
fecha y hora y comparte el link. Cada participante entra con Google y marca en cuáles puede. Apenas
una opción llega al quórum, la juntada se cierra sola, y el organizador avisa al grupo por WhatsApp
con un mensaje ya armado. Es un experimento con 2 o 3 grupos reales del operador, por invitación.

**Tipo**: feature · **Flujo**: design-first (el paso 0 es una prueba que despeja el riesgo de
probar la seguridad de la base sin Docker)

## Contexto

- PRD: v1 = crear juntada → link → entrar con Google → votar → cierre por quórum configurable
  (4 por defecto) → aviso por WhatsApp. Sin emails: el dominio, el link mágico y los recordatorios
  son de la v2.
- Se mide el supuesto "el registro liviano no frena la votación": tasa de voto ≥ 6 de 8 (la de
  hoy en WhatsApp).
- Desde la v1 se guarda el historial de participación (`movimientos`) para la gamificación (v4),
  sin mostrarlo todavía.

## Estado previo

Ver `ARCHITECTURE.md`: Astro 7 + `@astrojs/vercel`, landing prerenderizada en `/` con isla React
`LeadForm`, Action `saveLead`, tabla `leads` (RLS, `anon` solo inserta), paleta "Atardecer pixel"
en `src/styles/global.css`, sprites Kenney CC0, evals de las specs 001 y 002 en `evals/run.sh`.
No hay auth, ni páginas renderizadas en servidor, ni otras tablas. La máquina no tiene Docker.

## Paso 0 — prueba de factibilidad (antes de construir)

Levantar un Postgres embebido (sin Docker; p. ej. el paquete `embedded-postgres`) desde Vitest y,
sobre él:
1. Crear un "shim" mínimo del entorno de Supabase: roles `anon` y `authenticated`, schema `auth`
   con tabla `auth.users` y función `auth.uid()` que lee `request.jwt.claim.sub` (mismo
   comportamiento que Supabase).
2. Aplicar `001_leads.sql`.
3. Demostrar con un test que `set role anon` puede insertar en `leads` y no puede leer, y que
   `auth.uid()` devuelve el id simulado bajo `set role authenticated`.

Si el paso 0 no pasa, **parar y reportar** con alternativas. No construir nada más.

## Qué se construye

### Base de datos — `supabase/migrations/002_juntadas.sql`

Tablas (todas con RLS activado):

| Tabla | Columnas clave |
|---|---|
| `tipos_evento` | `id text` PK, `nombre`, `quorum_default`, `maximo_default`. Semilla: `('cena', 'Cena o reunión', 4, 10)` |
| `perfiles` | `id uuid` PK = `auth.users.id`, `nombre`, `email`, `lead_id` (FK `leads`, nullable), `creado_en` |
| `juntadas` | `id`, `codigo text unique`, `tipo` (FK), `titulo` (1-80), `organizador_id` (FK), `quorum` (2-10), `maximo` (default 10, ≤10), `tamano_grupo` (2-10), `estado` (`abierta` \| `cerrada` \| `cancelada`), `opcion_ganadora_id`, `creada_en`, `cerrada_en` |
| `opciones` | `id`, `juntada_id`, `inicio timestamptz`; único por (`juntada_id`, `inicio`) |
| `participantes` | (`juntada_id`, `perfil_id`) PK, `unido_en` |
| `disponibilidad` | (`opcion_id`, `perfil_id`) PK |
| `movimientos` | `id`, `perfil_id`, `juntada_id`, `tipo` (`creo_juntada` \| `se_unio` \| `voto` \| `confirmado` \| `cancelo`), `creado_en` |

Restricciones: `quorum ≤ maximo` y `quorum ≤ tamano_grupo`.

**Acceso solo por funciones** (`security definer`, `search_path` fijo). `authenticated` no tiene
políticas de insert/update/delete directas en ninguna tabla nueva, y solo puede leer su propia fila
de `perfiles`. `anon` no lee ninguna tabla. La tabla `leads` y su política no se tocan.

| Función | Quién | Qué hace |
|---|---|---|
| `asegurar_perfil()` | authenticated | Crea el perfil si no existe (nombre y email de Google). Si el email coincide con un lead (sin distinguir mayúsculas), completa `lead_id` |
| `crear_juntada(titulo, quorum, tamano_grupo, inicios timestamptz[])` | authenticated | Valida (2-10 opciones, todas futuras y distintas; quórum 2-10, ≤ tamaño del grupo). Genera el `codigo`, suma al organizador como participante, registra `creo_juntada`. Devuelve el código |
| `juntada_publica(codigo)` | anon y authenticated | Solo título, nombre del organizador y estado. Nada más |
| `unirse(codigo)` | authenticated | Rechaza si está cerrada o cancelada, o si ya hay 10 participantes. Idempotente. Registra `se_unio` |
| `detalle_juntada(codigo)` | participante | Opciones con sus votos, participantes **solo con nombre** (nunca email), quién votó, estado, ganadora |
| `votar(codigo, opciones_ids uuid[])` | participante | Bloquea la juntada (`for update`). Rechaza si no está abierta. Reemplaza la disponibilidad del votante y registra `voto`. Si alguna opción llega al quórum, cierra: **gana la de más votos; si empatan, la de `inicio` más temprano**. Marca `cerrada`, la ganadora y `cerrada_en`, y registra `confirmado` para quienes pueden en la ganadora |
| `cancelar(codigo)` | solo el organizador | Solo si está abierta. Marca `cancelada` y registra `cancelo` |

Vista `metricas_experimento` (sin acceso para `anon` ni `authenticated`; el operador la lee desde el
panel de Supabase): por juntada, `tamano_grupo`, cantidad de votantes, tasa de voto, estado y horas
hasta el cierre.

### Aplicación

- **Auth**: Supabase Auth con Google, con el paquete oficial para SSR (`@supabase/ssr`) y cookies.
  Ruta `/auth/callback`. Al entrar se llama a `asegurar_perfil()`.
- **Páginas renderizadas en el servidor** (`/` sigue prerenderizada e idéntica):
  - `/nueva`: sin sesión, botón "Entrar con Google". Con sesión, formulario: título, tamaño del
    grupo, quórum (default 4) y entre 2 y 10 opciones de fecha y hora. Al crear, va a `/j/<código>`.
  - `/j/<código>`: sin sesión, título, organizador y "Entrá con Google para votar". Con sesión:
    se une, muestra la grilla de opciones (marca sí o no en cada una), quién votó y cuántos faltan
    para el quórum. El organizador ve "Invitar al grupo por WhatsApp" (link de la juntada) y
    "Cancelar juntada". Código inexistente: mensaje "Esta juntada no existe" (estado 404).
  - Cerrada: "¡Quórum alcanzado! LEVEL CLEAR", la opción ganadora y el botón **"Avisar al grupo
    por WhatsApp"** →
    `https://wa.me/?text=<encodeURIComponent("¡Nos vemos! <título>: <día> <dd/mm>, <hh:mm> h. Detalle: <url>")>`.
  - Cancelada: "GAME OVER: la juntada se canceló".
  - Mensajes retro: "Player N se unió" (N = número de participante), "¡Quórum alcanzado! LEVEL
    CLEAR", "GAME OVER".
- **Fechas**: todo se muestra en `America/Argentina/Buenos_Aires`, formato es-AR
  (p. ej. "jueves 23/10, 21:00 h").
- **Código de la juntada**: al menos 128 bits aleatorios, en base64url (22 caracteres o más).
- La landing **no enlaza** a `/nueva` ni a `/j/…`.
- **Vista previa de diseño**: una ruta de desarrollo con datos de ejemplo de las pantallas (crear,
  votar, cerrada, cancelada) para tomar capturas. **No existe en el build de producción.**
- `README.md`: pasos del operador para configurar Google (Google Cloud → OAuth client → Supabase
  → Authentication → Providers → Google, con las URLs de redirección de Vercel y de localhost),
  correr `002_juntadas.sql` y leer `metricas_experimento`.

## Criterios de aceptación y sus evals

Los deterministas se agregan a `evals/run.sh`, una función por criterio. Los evals de las specs
001 y 002 siguen en el archivo y deben seguir pasando.

| # | Criterio | Eval |
|---|---|---|
| C0 | Postgres embebido con el shim de Supabase funciona | `npm run test:db` incluye y pasa el test del paso 0 |
| C1 | Compila y no rompe nada | `npm ci && npm run build` sale con código 0; `evals/run.sh` completo: 0 fallan |
| C2 | La migración tiene la forma pedida | `grep` sobre `002_juntadas.sql`: las 7 tablas; `enable row level security` en cada una; las 7 funciones con `security definer` y `set search_path`; ninguna `create policy … for insert/update/delete … to authenticated` en las tablas nuevas; no aparece `leads` en ningún `alter`/`drop`/`create policy` |
| C3 | Las reglas de la juntada y la seguridad funcionan en la base | `npm run test:db` (Postgres embebido + shim, aplicando 001 y 002) pasa con, como mínimo: crear con 1 opción → rechazo · con 11 → rechazo · con una opción pasada → rechazo · quórum > tamaño del grupo → rechazo · crear válido → código de ≥22 caracteres y organizador como participante · participante 11 → rechazo · unirse dos veces → una sola fila · votar sin ser participante → rechazo · votar dos veces → reemplaza · llegar al quórum → `cerrada` con la ganadora correcta · dos opciones llegan juntas con distintos votos → gana la de más votos · empate de votos → gana la más temprana · votar con la juntada cerrada → rechazo · cancelar sin ser organizador → rechazo · `movimientos` registra `creo_juntada`, `se_unio`, `voto`, `confirmado` · `anon` no puede leer ninguna tabla nueva · `authenticated` no puede insertar directo en ninguna tabla nueva · `detalle_juntada` no expone emails · un usuario no ve el detalle de una juntada ajena · `asegurar_perfil` vincula el lead por email sin importar mayúsculas · `anon` sigue pudiendo insertar en `leads` y no leer · `metricas_experimento` calcula bien la tasa (6 votantes / 8 → 0.75) y no la puede leer ni `anon` ni `authenticated` |
| C4 | El mensaje de WhatsApp y el código salen bien | `npm test` (Vitest) pasa con: una fecha UTC se formatea en hora argentina ("jueves 23/10, 21:00 h"); el link empieza con `https://wa.me/?text=` y decodifica al texto exacto; caracteres como "¿", "ñ" y "&" sobreviven codificados; el código generado tiene ≥22 caracteres base64url y no se repite en 10.000 generaciones |
| C5 | Las páginas sin sesión se ven y funcionan | Playwright contra la app con variables de Supabase falsas: `/nueva` sin sesión muestra el botón "Entrar con Google"; `/j/<código-inexistente>` responde 404 con "Esta juntada no existe"; a 375 px, sin scroll horizontal en las dos |
| C6 | La vista previa no llega a producción | En la salida de `npm run build` no existe la ruta de vista previa (grep en `.vercel/output`) |
| C7 | Sin secretos | `grep -riE "service_role\|sb_secret"` en `src/`, `supabase/`, `scripts/`, `tests/` = 0 resultados; `.env` no está en `git ls-files` |
| C8 | La identidad y la claridad se mantienen | Rúbrica (abajo) sobre capturas a 375 y 1280 px de las 4 pantallas de la vista previa, adjuntas al PR |
| C9 | El operador puede ponerla en marcha solo | `README.md` tiene las secciones: Login con Google, Migración 002, Métricas del experimento |

### Rúbrica de C8 (pasa si cumple todo)

1. Misma paleta "Atardecer pixel" y tipografías que la landing; ningún color nuevo fuera de ella
   salvo que pase contraste AA (registrar el ratio).
2. Votar se entiende en dos segundos: qué opciones hay, cómo marcar "puedo", dónde confirmar.
3. Se ve cuántos faltan para el quórum.
4. Aparecen los mensajes "Player N se unió", "LEVEL CLEAR" y "GAME OVER" en sus pantallas.
5. Español rioplatense en todo; fechas en formato argentino.
6. Botones con contraste AA y área táctil de al menos 44 px en celular.

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-14): la v1 arranca como experimento por invitación con 2-3 grupos
  propios, sin esperar los 30 leads; la landing no enlaza a la v1.
- DECIDIDO por Claudio (2026-10-14): login solo con Google; sin emails en la v1; el aviso de cierre
  se manda por un link de WhatsApp.
- DECIDIDO por Claudio (2026-10-14): desempate: más votos; si empatan, la fecha más temprana.
- DECIDIDO por Claudio (2026-10-14): el organizador propone entre 2 y 10 opciones; carga el tamaño
  del grupo; quórum 4 por defecto, configurable; tope de 10 participantes; la juntada se cierra
  sola al llegar al quórum y después no se puede votar; el organizador puede cancelar pero no
  cerrar a mano; zona horaria argentina.
- DECIDIDO por Claudio (2026-10-13): el historial de participación se guarda desde la v1, sin
  mostrarlo.

### Delegadas al agente, con criterio

- **Paquete de Postgres embebido**: el que corra en Linux sin Docker, con mantenimiento activo.
- **Cómo se ingresan las fechas**: el control más simple y accesible en celular (preferir el
  nativo del navegador) que pase la rúbrica.
- **División en componentes**: lo más simple que pase los evals; React solo donde haya
  interactividad (formulario de creación, grilla de votación).
- **Cómo se actualiza la grilla** cuando otro vota: alcanza con recargar al volver a la página;
  sin tiempo real.

### Condiciones de parada (el agente para y pregunta)

- El paso 0 no pasa.
- Algo exige tocar la tabla `leads`, su política o la landing `/`.
- Algo requiere un servicio pago, una cuenta nueva o claves reales.
- El paquete oficial de Supabase para SSR no funciona con Astro 7 + Vercel.
- Un criterio contradice a otro, o aparece una decisión que ninguna lista cubre.

## Efectos que escapan del sistema

**Ninguno durante la implementación.** El agente no toca el proyecto real de Supabase, Vercel ni
Google Cloud, y no conoce claves reales: todo se prueba con el Postgres embebido y variables
falsas. Correr la migración en producción, configurar Google y desplegar son actos del operador
siguiendo el README. Los links de WhatsApp solo abren WhatsApp con un texto: no envían nada solos.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Link mágico y emails | Algún participante de prueba no puede entrar sin Google, o empieza la v2 |
| Fecha límite y recordatorios | v2 (requiere dominio propio) |
| Juntadas recurrentes | v3 |
| Mostrar medallas, puntos y ranking | v4 (los datos ya se guardan) |
| Editar o borrar opciones después de crear | Un organizador de prueba lo pide |
| Otros tipos de evento en la interfaz (fútbol, asado) | Aparece el primer caso real en el experimento |
| Enlace desde la landing a la v1 | En al menos 2 de 3 grupos de prueba la tasa de voto es ≥ 6/8 |
| Actualización en tiempo real de la grilla | Los grupos de prueba lo extrañan |

## Evidencia de implementación (2026-10-14)

Rama `spec/003-v1-juntadas`. Decisiones: `decisions.md`, entradas `[v1]` del 2026-10-14.

### Paso 0

Pasó antes de construir nada: `embedded-postgres` 17.10 + `tests/db/supabase-shim.sql`, 4 tests en
`tests/db/shim.test.ts` (anon inserta en `leads` y no lee; `auth.uid()` devuelve el id simulado,
por `request.jwt.claims` y por `request.jwt.claim.sub`).

### `evals/run.sh`

```
PASS C1 el proyecto compila
PASS C2 las tres secciones y el formulario existen
PASS C3 campos del formulario
PASS C4 validación, honeypot, fuente y duplicados (Vitest)
     |       Tests  19 passed (19)
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
PASS 003·C0 Postgres embebido con shim de Supabase (paso 0)
     |       Tests  4 passed (4)
PASS 003·C1 compila con las rutas de la v1; la landing sigue prerenderizada y no enlaza a la v1
PASS 003·C2 migración: 7 tablas con RLS, 7 funciones security definer con search_path, sin escritura directa, leads intacta
PASS 003·C3 reglas y seguridad en la base (npm run test:db)
     |       Tests  34 passed (34)
PASS 003·C4 fechas en hora argentina, links de WhatsApp y código (Vitest)
     |       Tests  7 passed (7)
PASS 003·C5 /nueva y /j/<inexistente> sin sesión, 404 y 375 px sin scroll
     |   3 passed
PASS 003·C6 la vista previa no está en .vercel/output
PASS 003·C7 sin secretos en src, supabase, scripts y tests; .env sin versionar
PASS 003·C9 README con Login con Google, Migración 002 y Métricas del experimento
24 pasan · 0 fallan
```

El eval de C2 se probó contra cuatro mutaciones de la migración (política de update para
`authenticated`, función sin `search_path`, tabla sin RLS, `alter table public.leads`): las cuatro
fallan.

### C3: tests de `npm run test:db` (34, todos pasan)

Los de la spec, en `tests/db/juntadas.test.ts`: crear con 1 opción, con 11, con una pasada, quórum
mayor que el grupo → rechazo · crear válido → código ≥22 y organizador participante · participante
11 → rechazo · unirse dos veces → una fila · votar sin ser participante → rechazo · votar dos veces
→ reemplaza · llegar al quórum → cerrada con la ganadora, y votar con la juntada cerrada → rechazo
(mismo test) · dos opciones llegan juntas con distintos votos → gana la de más votos · empate → la
más temprana · cancelar sin ser organizador → rechazo · `movimientos` registra `creo_juntada`,
`se_unio`, `voto`, `confirmado` (y `cancelo`) · `anon` no lee ninguna tabla nueva ·
`authenticated` no inserta directo en ninguna · `detalle_juntada` sin emails · detalle ajeno →
rechazo · `asegurar_perfil` vincula el lead sin importar mayúsculas · `anon` inserta en `leads` y no
lee · `metricas_experimento` 6/8 → 0.75 y no la leen `anon` ni `authenticated`.

Además: opciones repetidas → rechazo · unirse a una cancelada → rechazo · votar una opción de otra
juntada → rechazo · el organizador cancela y después no se vota · `authenticated` solo lee su fila
de `perfiles` · `anon` no ejecuta las funciones de `authenticated` · `juntada_publica` devuelve solo
título, organizador y estado · borrar una juntada borra en cascada · 10.000 códigos de
`crear_juntada` sin repetirse (ver desvío 1) · los 4 del paso 0.

### Desvíos y hallazgos sobre la spec

1. **C4 pide probar en `npm test` que el código no se repite en 10.000 generaciones, pero la spec
   pone la generación en `crear_juntada`.** Se prueba el generador real en `npm run test:db`
   (10.000 llamadas a `crear_juntada`); `npm test` prueba la forma con `esCodigo`. Decisión
   "El código de la juntada lo genera la base".
2. **"Dos opciones llegan juntas con distintos votos" no se alcanza por la API**: un voto suma como
   mucho 1 a cada opción, así que dos opciones solo cruzan el quórum juntas empatadas. El test
   siembra el estado como admin y verifica la regla de desempate.
3. C5 corre contra `astro dev` con un Supabase falso local (`tests/app/stub-supabase.mjs`), porque
   `@astrojs/vercel` no tiene preview local.
4. `@supabase/ssr` 0.12.7 funciona con Astro 7.3.8: además del build, se probó a mano el ida y
   vuelta POST `/auth/login` (cookie PKCE y redirección a `/auth/v1/authorize?provider=google`) →
   `/auth/callback` (canje, cookie de sesión, `asegurar_perfil`) → `/j/<código>` con sesión → POST
   de voto (303) → POST de `/nueva` (la hora 21:00 argentina viajó como 00:00 UTC), contra un
   Supabase falso. Falta la prueba contra Google y Supabase reales, que es del operador (README).
5. La landing sale igual: mismo `index.*.css`; el HTML solo cambia en el hash del chunk de
   `LeadForm` y el `uid` de su isla.

### C8: rúbrica sobre la vista previa

Capturas a 375 y 1280 px (`crear`, `votar`, `cerrada`, `cancelada`), tomadas con Chromium sobre
`astro dev`: `{crear,votar,cerrada,cancelada}-{375,1280}.png`, adjuntas al PR. Ninguna tiene scroll
horizontal (`scrollWidth` = 375 y 1280).

1. **Paleta y tipografías** — pasa. Press Start 2P en títulos, etiquetas y botones; fuente del
   sistema en el texto. Solo colores de la paleta (tokens de la UI y bandas del cielo del hero); el
   checkbox nativo blanco se reemplazó por uno propio. Ratios en `decisions.md` ("Estilos de la app
   en `app.css`…"): el menor de texto es 5.74 ("LEVEL CLEAR" #f6b8c8 sobre #4a3a7e); borde del checkbox 5.21.
2. **Votar en dos segundos** — pasa. Leyenda "Marcá las fechas en las que podés", cada fecha es una
   fila entera tocable con su checkbox y la etiqueta "Puedo" / "No puedo", y un solo botón
   "Confirmar mi voto" / "Actualizar mi voto" debajo.
3. **Cuántos faltan para el quórum** — pasa. "Falta 1 voto en una misma fecha para el quórum de 4"
   arriba de la grilla, y "3/4 votos" en cada fecha.
4. **Mensajes retro** — pasa. "Player N se unió" en la lista de jugadores de las tres pantallas de
   juntada; "¡Quórum alcanzado! LEVEL CLEAR" en cerrada; "GAME OVER: la juntada se canceló" en
   cancelada.
5. **Rioplatense y fechas argentinas** — pasa. Voseo en todo ("Marcá", "Proponé", "Organizás vos");
   fechas "jueves 22/10, 21:00 h". El placeholder del `datetime-local` vacío ("dd/mm/yyyy") lo
   dibuja el navegador según el idioma del dispositivo; en un celular en español dice "dd/mm/aaaa".
6. **Botones AA y 44 px** — pasa. A 375 px: "Confirmar/Actualizar mi voto" 301×54, "Invitar al
   grupo por WhatsApp" 301×75, "Cancelar juntada" 301×48, "Avisar al grupo por WhatsApp" 265×75,
   "Crear juntada" 301×54, "+ Agregar fecha" 301×48, quitar fecha 48×54, cada fila de fecha 301×71.
   Contraste: botón primario 8.94, secundario 7.39.
