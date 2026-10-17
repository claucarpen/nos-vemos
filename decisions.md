# nos-vemos — Decisiones

> Append-only: acá no se corrige nada. Cuatro campos por decisión — el formato está en
> `CLAUDE.md`.
>
> Nace sin entradas.

## 2026-10-13 · [landing] Mascota v0 con los colores originales del pack

**Qué se decide**: la mascota v0 es el tile 98 de Tiny Dungeon (Kenney, CC0) sin recolorear; la paleta de la UI sale del pack, sin neón.
**Por qué**: decisión del operador (2026-10-13) tras ver un recolor magenta/verde agua, que no le gustó. La unicidad de la mascota se refina después en Piskel.
**La invalidaría**: que el operador entregue una mascota propia desde Piskel.

## 2026-10-13 · [landing] Pack Tiny Dungeon (16×16) y tipografía Press Start 2P

**Qué se decide**: sprites de Tiny Dungeon (Kenney, CC0, 16×16) en `public/sprites/` con su `License.txt`; fuente Press Start 2P (OFL 1.1) solo en títulos, etiquetas y botón; el texto largo va en la fuente del sistema.
**Por qué**: Tiny Town casi no trae personajes; Pixel Platformer es 18×18. Tiny Dungeon cumple licencia, resolución, personajes y escenarios, y es el más arcade.
**La invalidaría**: que el pack deje de cubrir lo que pida el diseño, o que el texto en Press Start 2P no se lea en pantallas chicas.

## 2026-10-13 · [landing] Botón de envío color naranja del pack, contraste 7.7:1

**Qué se decide**: el botón usa `#e19a65` con texto `#181425`.
**Por qué**: es un color del pack; la relación de contraste es 7.73:1 (WCAG AA exige 4.5:1). El primer intento, magenta `#ff4fa3`, daba 5.9:1 y se descartó por la decisión de paleta.
**La invalidaría**: cambiar la paleta de la UI o el color del botón.

## 2026-10-13 · [landing] Detalles de saveLead que la spec no cerraba

**Qué se decide**: (1) `.gitignore` ignora `.env.*` salvo `.env.example`. (2) Un nombre o email inválido en el servidor responde "Revisá tu nombre y tu email e intentá de nuevo.". (3) Un `utm_source` de más de 50 caracteres se trata como inválido y guarda `directo`, no se trunca. (4) Sin `PUBLIC_CONTACT_EMAIL`, el aviso de privacidad omite la oración del email, para que el build pase sin la variable; el checklist del README exige cargarla. (5) El checklist del README pide verificar que el aviso cumpla lo que exige el país del operador; no se afirma nada legal. (6) La lógica vive en `src/lib/leads.ts` con cliente inyectable, y la Action solo lo conecta.
**Por qué**: la spec define los mensajes de éxito y de error, no estos casos; son la opción más simple y reversible.
**La invalidaría**: que la spec o el operador fijen otro comportamiento para alguno de estos casos.

## 2026-10-13 · [landing] Deuda técnica declarada: vulnerabilidad alta en path-to-regexp

**Qué se decide**: se acepta `npm audit` con 1 vulnerabilidad alta (`path-to-regexp` 4.0.0-6.2.2, GHSA-9wv6-86v2-598j) que llega por `@astrojs/vercel`. No se aplica `npm audit fix --force`.
**Por qué**: el fix baja el adaptador a la v8, un cambio incompatible con Astro 7. Es una dependencia del adaptador, no de código propio.
**La invalidaría**: que `@astrojs/vercel` publique una versión que la actualice; entonces se actualiza y se borra esta deuda.

## 2026-10-13 · [landing] Paleta RPG clásico + Tiny Town para el hero exterior, por decisión del operador

**Qué se decide**: la UI usa la paleta "RPG clásico" (fondo #1f2a1c, pasto #3f6b35, paneles #5a3e2b, contorno #2a1d0e, oro #c8a24a, pergamino #e6d3a3, texto #f1ead6, más #d9cfb3 para texto secundario). El hero es exterior: pasto, camino y árboles de Tiny Town (Kenney, CC0, 16×16), con la mascota (tile 98 original) y el cofre y la poción de Tiny Dungeon. Cada pack lleva su licencia en `public/sprites/`.
**Por qué**: decisión del operador. Los contrastes WCAG medidos: botón 6.81, texto en panel 8.10, títulos sobre fondo 10.11, etiquetas y títulos en panel 6.58, tagline oro sobre fondo 6.20, aviso de privacidad 6.27, texto del input 13.65, borde del input 6.58 (mínimos: 4.5 texto, 3 elementos gráficos). El oro sobre panel da 4.04 y falla para texto chico: por eso el oro solo se usa sobre el fondo y en el botón.
**Reemplaza a**: la paleta solo-Tiny Dungeon del 2026-10-13 (botón naranja #e19a65, contraste 7.73).
**La invalidaría**: que el operador cambie de paleta o que el oro se use como texto sobre el panel.

## 2026-10-13 · [landing] Paleta Atardecer pixel (lavanda), por decisión del operador

**Qué se decide**: la UI usa fondo #1e1b3a, paneles #2c2950 con borde de 1 px #4a4672 y radio de 6 px, títulos #edf2f7, texto #cbd5e0, texto atenuado #a0aec0, tagline #f6b8c8 y un único acento lavanda #c4b5fd (h3, etiquetas, enlaces y botón con texto #1e1b3a). El borde de los inputs es #8b84b8, no #4a4672. El hero muestra un atardecer: cielo en cinco bandas planas (#2d2a5a, #4a3a7e, #7b4a9a, #b5589a, #f29e8e) sobre el suelo de Tiny Town, con la mascota, el cofre y la poción. La idea de paleta se inspira en el aspecto de pixellab.ai; no se usó ni copió ninguna de sus obras.
**Por qué**: decisión del operador: UI casi neutra con un acento, y todo el color en el hero. #4a3a7e de borde de input daba 1.56:1 contra el panel y 2.06:1 contra el fondo del input (mínimo 3:1 para componentes de interfaz); #8b84b8 da 3.95:1 y 5.21:1.
**Reemplaza a**: la paleta RPG clásico del mismo día (fondo bosque, paneles de madera, botón oro).
**La invalidaría**: que el operador cambie de paleta.

## 2026-10-13 · [landing] Hero como header a todo el ancho, por decisión del operador

**Qué se decide**: el hero ocupa el ancho completo del viewport. Arriba, título, tagline y botón sobre las dos bandas oscuras del cielo (#2d2a5a y #4a3a7e); debajo, tres bandas planas de horizonte (#7b4a9a, #b5589a, #f29e8e), una fila de pasto y una de tierra de Tiny Town repetidas en horizontal, con escala entera (x3 hasta 639 px, x4 desde 640 px). La mascota va centrada en el camino; árboles, flores, hongos, cofre y poción se reparten simétricos desde el centro, y los elementos "wide" solo aparecen desde 640 px para que nada quede cortado. Los murciélagos de Tiny Dungeon y estrellas de 4 px dan vida al cielo; no se sumó ningún pack.
**Por qué**: decisión del operador. Contrastes del texto del hero: título #edf2f7 sobre #2d2a5a 11.72 y sobre #4a3a7e 8.48; tagline #f6b8c8 sobre #2d2a5a 7.93 y sobre #4a3a7e 5.74; botón 8.94. Ningún texto toca las bandas violeta, rosa ni durazno (el tagline sobre #7b4a9a daría 3.83 y falla). A 375 px el hero mide 407 px (50 % de 812) y no hay scroll horizontal; a 1280 px mide 464 px.
**Reemplaza a**: el hero de caja centrada de 320×256 px de la paleta Atardecer pixel.
**La invalidaría**: que el texto del hero crezca hasta las bandas violeta, o que el operador cambie el hero.

## 2026-10-13 · [landing] Pulido del header: tagline en una sola banda, sin murciélagos, pino completo

**Qué se decide**: el título vive en la banda oscura #2d2a5a y el tagline con el botón en la banda #4a3a7e, cada texto entero dentro de una sola banda. Se sacan los murciélagos (markup y `public/sprites/bat.png`); quedan las estrellas. Todos los árboles son el mismo pino de dos tiles de Tiny Town: copa `town_4` sobre tronco `town_16`.
**Por qué**: decisión del operador. `town_16` solo es la mitad de abajo de un árbol (con el borde de arriba abierto) y `town_28` es un pino chico distinto; los árboles usados antes mostraban la copa cortada. Contrastes sin cambios: título sobre #2d2a5a 11.72, tagline sobre #4a3a7e 5.74, botón 8.94. A 375 px el hero mide 427 px de 812 (53 %) y a 1280 px mide 484 px.
**La invalidaría**: que el tagline o el botón crezcan fuera de su banda, o que el operador pida otro tipo de árbol.

## 2026-10-14 · [landing] Escenario del hero por tiers de ancho mínimo, solo CSS

**Qué se decide**: cada sprite de `.world` lleva una clase `wN` (`w362`, `w448`, `w733`, `w848`, `w912`, `w1117`, `w1360`) y se muestra con `@media (min-width: Npx)`; N = ceil(2 × `--u` × extensión del lado derecho del par) + 16. Reemplaza a la clase `.wide` y su corte único en 640 px. Se esconde, nunca se mueve; los pares izquierda/derecha y copa/tronco comparten tier; la flor en x=9.5 y el pino en x=-9.2 comparten el tier 1360.
**Por qué**: es lo más simple que cumple "entero o ausente" de 320 a 1920 px sin JavaScript ni tocar `--u`, la paleta o los sprites; el margen de 16 px cubre la barra de scroll, que reduce el ancho del hero sin cambiar el del `@media`. A 1920 px se ven los 28 sprites.
**Reemplaza a**: la regla de "elementos wide solo desde 640 px" de la decisión del header a todo el ancho (2026-10-13).
**La invalidaría**: cambiar `--u`, mover o sumar sprites sin actualizar su tier (lo detecta `tests/e2e/hero-clipping.spec.ts`), o que se prefiera un cálculo automático del tier.

## 2026-10-14 · [v1] Postgres embebido con `embedded-postgres` 17 y un shim fiel a los permisos de Supabase

**Qué se decide**: `npm run test:db` levanta un cluster por archivo con `embedded-postgres` 17.x (binarios por npm, sin Docker) y aplica `tests/db/supabase-shim.sql`: roles `anon` y `authenticated`, `auth.users`, `auth.uid()` con la definición de Supabase (`request.jwt.claim.sub` o `request.jwt.claims`), pgcrypto en `extensions` y los privilegios por defecto de Supabase (`grant all` a `anon` y `authenticated` sobre lo nuevo de `public`). `package.json` declara `allowScripts` para el postinstall de `@embedded-postgres/linux-x64`.
**Por qué**: es el paquete que corre en Linux sin Docker con versión de 2026 y la misma versión mayor que Supabase. Sin los privilegios por defecto el shim daría falsos verdes: en Supabase una tabla nueva sin `revoke` queda legible si se olvida RLS. PGlite se descartó: es Postgres en WASM de un solo usuario y el cambio de rol no se comporta igual. npm 11 bloquea los postinstall sin aprobación y sin él faltan los symlinks de las bibliotecas.
**La invalidaría**: que Supabase cambie sus privilegios por defecto o la definición de `auth.uid()`, o que `embedded-postgres` deje de publicar binarios.

## 2026-10-14 · [v1] El código de la juntada lo genera la base; su prueba de unicidad corre en `test:db`

**Qué se decide**: `crear_juntada` genera el código con `extensions.gen_random_bytes(16)` en base64url (22 caracteres). La prueba "10.000 códigos sin repetirse, base64url de ≥22" llama 10.000 veces a `crear_juntada` en `tests/db/juntadas.test.ts`, no en `npm test`. En TypeScript solo existe `esCodigo` (`src/lib/codigo.ts`), que reconoce la forma para responder 404 sin consultar la base.
**Por qué**: la spec fija la firma de `crear_juntada` sin parámetro de código y dice que la función lo genera; C4 pide probarlo en Vitest de `npm test`. Un generador en TypeScript sería código muerto o cambiaría la firma. Probar el generador real es más fuerte que probar una copia.
**La invalidaría**: que el operador prefiera generar el código en la app y pasarlo a `crear_juntada`.

## 2026-10-14 · [v1] Doble barrera en la base: `revoke` explícitos además de RLS

**Qué se decide**: las 7 tablas nuevas tienen RLS y además `revoke all` para `anon` y `authenticated` (salvo `select` de `perfiles` para `authenticated`, con política de su propia fila). Cada función hace `revoke all … from public, anon, authenticated` y concede `execute` solo a quien corresponde. `metricas_experimento` es `security_invoker` y sin acceso para `public`, `anon` ni `authenticated`.
**Por qué**: Supabase concede todo por defecto a `anon` y `authenticated`, y Postgres da `execute` a `public`: sin los `revoke`, una política olvidada o una función auxiliar quedarían expuestas por la API. Una vista sin `security_invoker` corre con los permisos de su dueño y saltea RLS.
**La invalidaría**: que se agregue una tabla o función nueva sin su `revoke`; los tests de seguridad de `tests/db/juntadas.test.ts` lo detectan para las tablas listadas.

## 2026-10-14 · [v1] Reglas de juntada que la spec no cerraba

**Qué se decide**: (1) Votar sin marcar ninguna fecha es válido ("no puedo en ninguna") y cuenta como votante. (2) "Votó" es tener un movimiento `voto`; no hay columna nueva. (3) `unirse` chequea en orden: existe → abierta → ya participante (no hace nada) → cupo. La página pide `detalle_juntada` primero y solo llama a `unirse` si no es participante, así quien ya está ve su juntada cerrada o cancelada. (4) `crear_juntada` y `unirse` llaman a `asegurar_perfil` (idempotente) por si el callback no lo hizo. (5) El cupo de 10 es `maximo`, independiente de `tamano_grupo`. (6) `tasa_voto` = votantes / `tamano_grupo` redondeada a 2 decimales; puede pasar de 1 si se suman más personas que las cargadas. (7) `horas_hasta_cierre` solo existe para cerradas; cancelar no llena `cerrada_en`. (8) El nombre visible es `full_name` de Google, si no `name`, si no la parte local del email. (9) Votar una opción de otra juntada se rechaza (`opcion_ajena`). (10) El número de Player es el orden de `unido_en`; el organizador es Player 1. (11) Los errores de negocio se lanzan como mensajes-clave (`juntada_no_abierta`, …) y `src/lib/errores.ts` los traduce.
**Por qué**: la spec define las reglas y los rechazos, no estos casos borde; cada uno es la opción más simple compatible con los criterios.
**La invalidaría**: que la spec o el operador fijen otro comportamiento para alguno de estos casos.

## 2026-10-14 · [v1] Formularios HTML con POST a la propia página; React solo en la isla de crear

**Qué se decide**: `/nueva` y `/j/<código>` reciben POST en su propio frontmatter y redirigen con 303 (votar, cancelar, crear). La grilla de votación es un formulario con checkboxes nativos, sin JS. La isla React `CrearJuntadaForm` solo agrega y quita filas de fecha (2 a 10). No se usan Actions ni se toca `src/actions/index.ts`. Cancelar pide confirmación con `confirm()`.
**Por qué**: es lo más simple que pasa los evals, funciona sin JavaScript y no toca nada que use la landing. Las Actions obligaban a sumar al mismo archivo que `saveLead`. Astro rechaza POST de otro origen (`checkOrigin`).
**La invalidaría**: que la grilla necesite actualizarse sin recargar (tiempo real, fuera de alcance).

## 2026-10-14 · [v1] Fechas con `datetime-local` nativo interpretado como hora argentina

**Qué se decide**: cada opción es un `<input type="datetime-local">` con `min` en la hora argentina actual. El servidor interpreta el valor en `America/Argentina/Buenos_Aires` con el offset que da `Intl` (no un `-03:00` fijo) y rechaza fechas imposibles. Todo se muestra como "jueves 23/10, 21:00 h".
**Por qué**: el control nativo es el más simple y accesible en celular (la spec lo prefiere). Con `Intl` el código sigue bien si Argentina vuelve a tener horario de verano.
**La invalidaría**: que la rúbrica de C8 falle en algún celular de los grupos de prueba por el control nativo.

## 2026-10-14 · [v1] El tamaño del grupo no tiene valor por defecto; el quórum sí (4)

**Qué se decide**: en `/nueva`, "Personas en el grupo" es obligatorio y empieza vacío; "Quórum" empieza en 4.
**Por qué**: la tasa de voto del experimento divide por `tamano_grupo`; un valor por defecto que el organizador no corrige la distorsiona. El 4 del quórum lo fija la spec.
**La invalidaría**: que los organizadores de prueba se traben con el campo vacío.

## 2026-10-14 · [v1] Login: POST a `/auth/login`, PKCE en cookies, vuelta a `next` solo si es ruta interna

**Qué se decide**: "Entrar con Google" es un formulario POST a `/auth/login`, que llama a `signInWithOAuth` de `@supabase/ssr` (el verificador PKCE queda en cookie) y redirige a Google. `/auth/callback` canjea el código, llama a `asegurar_perfil()` y redirige a `next` solo si empieza con `/` y no con `//` ni `/\`. Si falla, vuelve con `?login=error`. La v1 no tiene botón de salir.
**Por qué**: el flujo SSR oficial de Supabase. Validar `next` evita usar el login como redirección abierta. Salir no está en la spec y la sesión se puede cerrar desde la cuenta de Google.
**La invalidaría**: que un grupo de prueba comparta dispositivos y necesite salir.

## 2026-10-14 · [v1] Vista previa inyectada solo en `astro dev`

**Qué se decide**: `astro.config.mjs` suma la integración `vista-previa`, que inyecta `/vista-previa/[pantalla]` (`src/dev/vista-previa.astro`) solo si el comando es `dev`. Pantallas: `crear`, `votar`, `cerrada`, `cancelada`, con los mismos componentes que las páginas reales. La barra de herramientas de desarrollo de Astro queda desactivada porque tapaba las capturas.
**Por qué**: fuera de `src/pages` la ruta no existe en el build; C6 lo verifica con grep sobre `.vercel/output`.
**La invalidaría**: que Astro empiece a construir rutas inyectadas en `dev` también en `build`.

## 2026-10-14 · [v1] C5 corre contra `astro dev` con un Supabase falso local

**Qué se decide**: `playwright.app.config.ts` levanta `tests/app/stub-supabase.mjs` (responde que ninguna juntada existe) y `astro dev --ignore-lock` con `PUBLIC_SUPABASE_URL` apuntando al stub y una publishable key inventada. Un código mal formado responde 404 sin consultar; uno bien formado consulta `juntada_publica` y responde 404 si viene vacía, o 503 si la base falla.
**Por qué**: `@astrojs/vercel` no tiene servidor de preview local, y sin stub el código bien formado daría 503 por red. `--ignore-lock` deja `astro dev` en primer plano: Astro 7 lo pasa a segundo plano si detecta un agente y Playwright no podría cerrarlo.
**La invalidaría**: que el adaptador de Vercel sume un preview local; entonces C5 corre contra el build.

## 2026-10-14 · [v1] Estilos de la app en `app.css`, sin colores fuera de la paleta Atardecer pixel

**Qué se decide**: la app importa `global.css` (sin cambios) y `src/styles/app.css`. Solo usa colores de la paleta: los tokens de la UI y las bandas del cielo del hero (#2d2a5a, #4a3a7e, #7b4a9a, #b5589a, #f29e8e). El checkbox de cada fecha es propio (fondo #16142b, borde #8b84b8; marcado: #c4b5fd con tilde pixelado #1e1b3a) para no mostrar el blanco nativo. Las páginas de la app llevan `noindex`.
**Por qué**: la landing sale idéntica: mismo `index.*.css`, y el HTML solo cambia en el hash del chunk de `LeadForm` y el `uid` de la isla (React pasó a un chunk compartido). Contrastes medidos: botón #1e1b3a sobre #c4b5fd 8.94; botón secundario y "Player N" #c4b5fd sobre #2c2950 7.39 y sobre #1e1b3a 8.94; "LEVEL CLEAR" #f6b8c8 sobre #4a3a7e 5.74; fecha ganadora #edf2f7 sobre #4a3a7e 8.48; "GAME OVER" #f29e8e sobre #2d2a5a 6.32; alerta #f29e8e sobre #1e1b3a 7.90; "Puedo" #f6b8c8 sobre #2d2a5a 7.93; "No puedo" y votos #a0aec0 sobre #16142b 7.96; borde del checkbox #8b84b8 sobre #16142b 5.21 (mínimos: 4.5 texto, 3 componentes). Los bordes de los banners (#7b4a9a 2.14, #b5589a 3.13 sobre #2c2950) son decorativos: el banner no es interactivo.
**La invalidaría**: que el operador cambie de paleta o que se use un color fuera de esta lista.

## 2026-10-14 · [v1] Texto de la invitación por WhatsApp

**Qué se decide**: "Invitar al grupo por WhatsApp" abre `https://wa.me/?text=` con "¡Armemos <título>! Entrá y marcá qué días podés: <url>". El aviso de cierre usa el texto exacto de la spec.
**Por qué**: la spec fija el texto del cierre, no el de la invitación; este es corto, rioplatense y lleva el link.
**La invalidaría**: que el operador pida otro texto.

## 2026-10-14 · [privacidad] `/privacidad` es una página propia, indexable, con el layout mínimo de la landing

**Qué se decide**: `privacidad.astro` no usa `App.astro` (que lleva `noindex`) ni el header ilustrado; importa `global.css` y `privacidad.css`, con barra de marca y paneles.
**Por qué**: Google tiene que poder leer la política; `App.astro` es solo para pantallas privadas. El texto largo necesita un ancho de lectura de 40rem.
**La invalidaría**: que la app pase a tener páginas públicas indexables que compartan layout.

## 2026-10-14 · [privacidad] `#datos` declara los datos técnicos (IP) que registran Supabase y Vercel

**Qué se decide**: `#datos` suma un cuarto ítem, "Datos técnicos": Supabase y Vercel registran datos técnicos de las visitas y los inicios de sesión (por ejemplo la dirección IP) por seguridad; no se usan para nada más. 004·C2 exige "dirección IP".
**Por qué**: la revisión de lo guardado encontró que Supabase Auth registra la IP de las sesiones fuera de las tablas de la app; la política no podía omitirlo para ser honesta. Lo decidió el operador.
**La invalidaría**: que se agregue analítica propia o se use ese registro para otra cosa; habría que declararlo.

## 2026-10-16 · [landing] La landing enlaza a `/nueva` como acción principal; los leads quedan como segunda opción

**Qué se decide**: el botón del header dice "Press Start: creá tu juntada" y lleva a `/nueva`; el formulario de leads pasa a "¿Todavía no?". El único enlace de la landing a la v1 es `href="/nueva"`; el eval `003·C1` pasa a exigir eso (ningún `href` a `/j/`) en vez de "la landing no enlaza a la v1". Lo decidió el operador (spec 005, opción C).
**Por qué**: la v1 ya funciona de punta a punta y la landing era la única puerta de entrada pública; los leads sirven a quien todavía no tiene una juntada que organizar. Efecto buscado: cualquier visitante puede crear juntadas.
**Reemplaza a**: la decisión de la spec 003 "la landing no enlaza a la v1".
**La invalidaría**: que crear juntadas abiertas al público genere abuso o ruido que obligue a volver a la entrada por invitación.

## 2026-10-16 · [app] El link "¿Qué es Nos Vemos?" vive una sola vez, en la barra de `App.astro`, a la derecha

**Qué se decide**: `App.astro` muestra un link de texto chico (color `--muted`, subrayado) a `/` en el extremo derecho de la barra; cubre `/nueva` y `/j/<código>` en todos sus estados. Eval `005·C3` exige que aparezca una sola vez en `src/`.
**Por qué**: la barra es visible a 375 px sin scroll y no se mezcla con "Entrar con Google" ni con los botones del contenido; ponerlo por página lo repetiría.
**La invalidaría**: que la barra del layout gane otros elementos y no alcance el ancho a 375 px.

## 2026-10-16 · [evals] Prueba de `003·C1` modificado: una mutación temporal lo hace fallar

**Qué se decide**: se probó con `<a href="/j/x">` temporal en el footer de la landing: `003·C1` y `005·C4` fallaron; revertida la mutación, pasan. Sin la mutación, `003·C1` acepta el link a `/nueva`.
**Por qué**: un eval que solo se vio pasar no prueba que detecte lo que dice detectar (criterio C4 de la spec 005).
**La invalidaría**: que `003·C1` se vuelva a cambiar.

## 2026-10-16 · [landing] El botón del header dice exactamente "Creá tu juntada"

**Qué se decide**: el botón del header de la landing dice "Creá tu juntada" (href `/nueva`). `005·C1` exige ese texto y que "Press Start: creá tu juntada" no aparezca.
**Por qué**: el tagline justo arriba ya dice "Press Start para la próxima juntada"; repetir la frase sobraba. Lo decidió el operador.
**Reemplaza a**: el texto "Press Start: creá tu juntada" de la decisión "La landing enlaza a `/nueva` como acción principal" (la regla de enlazar a `/nueva` sigue vigente).
**La invalidaría**: que el operador pida otro texto.
