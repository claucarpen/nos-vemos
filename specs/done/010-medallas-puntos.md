---
status: implementada
depends_on: [003, 004, 006, 007]
---

# 010 — v4: puntos, medallas y ranking dentro de cada juntada

Mostrar lo que la v1 viene guardando en `movimientos`. Cada participación suma puntos, ciertos
hitos dan medallas, y en cada juntada se ve un ranking de sus participantes. Cada uno tiene una
página `/perfil` con sus puntos, sus medallas y su historial, y una página pública `/reglas`
explica cuándo y cuánto suma o resta cada acción. La promesa "Con premios" de la
landing pasa a "Disponible".

**Tipo**: feature · **Flujo**: requirements-first

## Contexto

- Spec 003, "Fuera de alcance": "Mostrar medallas, puntos y ranking" se reactiva en la v4; los
  datos ya se guardan.
- La base sabe quién votó, cuándo, y quién podía en la fecha ganadora (`confirmado`). **No sabe
  quién fue de verdad**: los premios se basan solo en lo que ya hay.
- No existen los "grupos": cada juntada va por su lado. El ranking se arma por juntada.

## Estado previo

Ver `ARCHITECTURE.md`, "Base de la v1": tabla `movimientos` (`perfil_id`, `juntada_id`, `tipo` en
`creo_juntada | se_unio | voto | confirmado | cancelo`, `creado_en` con `clock_timestamp()`, `id`
creciente). `votar()` inserta un `voto` cada vez que alguien vota (también al cambiar el voto) y,
si la juntada se cierra, inserta los `confirmado` después del último `voto`, en la misma llamada.
Páginas: `/nueva`, `/j/<código>` (`Juntada.astro`, estados abierta / cerrada "LEVEL CLEAR" /
cancelada "GAME OVER"), `/privacidad`. La landing (`index.astro`, `#solucion`) marca "Con premios"
como "Próximamente" (evals `006·C1`, `007·*`).

## Qué se construye

### Reglas de puntos

Los puntos se **calculan** a partir de `movimientos` y `juntadas`; no se guardan en una tabla. Se
cuentan desde el primer movimiento de la v1 (retroactivo). **Hay puntos negativos, y el total
puede quedar por debajo de 0.**

Suman:

| Regla | Puntos | Cuándo cuenta | Tope |
|---|---|---|---|
| Votar | +10 | Primer `voto` de la persona en la juntada | 1 por juntada |
| Voto rápido | +5 | Ese primer `voto` llegó en menos de 24 h desde `juntadas.creada_en` | 1 por juntada |
| Confirmado | +20 | Tiene `confirmado` en la juntada | 1 por juntada |
| Organizar con éxito | +30 | Es el organizador y la juntada quedó `cerrada` | 1 por juntada |

Restan:

| Regla | Puntos | Cuándo cuenta | Tope |
|---|---|---|---|
| Voto tardío | −5 | El primer `voto` llegó 72 h o más después de `juntadas.creada_en` | 1 por juntada |
| Te colgaste | −15 | La juntada quedó `cerrada`, la persona no votó nunca y se había unido al menos 12 h antes de `cerrada_en` | 1 por juntada |
| Cambio de último momento | −3 | Cada `voto` después del primero, en las últimas 2 h antes de `cerrada_en` | 3 por juntada |
| Cancelar | −15 | Es el organizador y la juntada quedó `cancelada` | 1 por juntada |

Ventanas del primer voto:

| Desde `creada_en` | Efecto |
|---|---|
| menos de 24 h | +5 |
| de 24 h a menos de 72 h | 0 |
| 72 h o más | −5 |

- Una juntada `cancelada` no da puntos a nadie, ni siquiera por votos previos; solo resta al
  organizador.
- Mientras la juntada sigue `abierta` cuentan las reglas que ya se pueden calcular ("Votar", "Voto
  rápido", "Voto tardío"); las demás se aplican al cerrarse o cancelarse.
- "Te colgaste" no aplica a quien se unió menos de 12 h antes del cierre: no tuvo tiempo de votar.
- Los "Cambio de último momento" restan aunque la persona también sume por "Confirmado".

### Medallas

Cada medalla se gana una sola vez. Su **juntada de origen** es aquella en la que se cruzó el
umbral (por `creado_en` del movimiento que lo cruzó).

| Id | Nombre | Se gana cuando |
|---|---|---|
| `primer_voto` | Player 1 | Primer voto en una juntada que no quedó cancelada |
| `rayo` | Rayo | Voto rápido en 3 juntadas |
| `destrabador` | Llave final | Su voto cerró la juntada: el `voto` de `id` más alto de una juntada `cerrada` |
| `infaltable` | Infaltable | `confirmado` en 5 juntadas |
| `anfitrion` | Anfitrión | Organizó 3 juntadas que quedaron `cerradas` |
| `fantasma` | Fantasma | "Te colgaste" en 3 juntadas. Medalla de la vergüenza: se muestra distinta de las demás |
| `redencion` | Redención | Vuelve a votar en una juntada después de haber tenido "Te colgaste" en la anterior en la que participó |

Las medallas no se pierden: "Fantasma" queda aunque después la persona vote siempre, y "Redención"
la acompaña.

### Base de datos — `supabase/migrations/003_premios.sql`

Sin tablas nuevas. `002_juntadas.sql` y `001_leads.sql` no se tocan. Mismas reglas de acceso que la
v1: funciones `security definer`, `search_path` fijo, `revoke all … from public, anon,
authenticated` y `execute` solo a `authenticated`.

| Función | Quién | Devuelve |
|---|---|---|
| `mis_premios()` → jsonb | authenticated | Puntos totales; medallas ganadas (id, nombre, fecha, título de la juntada de origen); historial: cada juntada en la que participa (código, título, estado, puntos ganados en ella), de la más nueva a la más vieja |
| `ranking_juntada(codigo)` → jsonb | participante de esa juntada | Por participante: **solo nombre** (nunca email), puntos totales y cantidad de medallas, de mayor a menor (empate: el que se unió antes). Además, las medallas cuya juntada de origen es esta, con el nombre de quien la ganó |

Errores de `ranking_juntada`: `no_existe`, `no_participante` (los mismos códigos que
`detalle_juntada`).

### Interfaz

- **`/j/<código>`**, en los tres estados: un panel "Ranking" bajo la grilla, con la posición, el
  nombre y los puntos. La persona que mira aparece resaltada. Los totales negativos se muestran
  con signo "−" y un color de alerta.
- **`/j/<código>` abierta, antes de votar**: un aviso corto de lo que está en juego ("Votá en
  menos de 24 h: +5. Si no votás y se cierra: −15"), con el tiempo que falta para cada ventana.
- **`/j/<código>` cerrada (LEVEL CLEAR)**: arriba del ranking, las medallas ganadas en esta
  juntada ("¡Ana ganó Llave final!") y quiénes perdieron puntos ("Leo se colgó: −15"). Si no
  hubo, no aparece nada.
- **`/perfil`** (nueva, renderizada en servidor): sin sesión muestra "Entrar con Google"; con
  sesión, puntos totales, el detalle de lo que sumó y restó en cada juntada, medallas ganadas, medallas por ganar (atenuadas, con la condición) e
  historial con link a cada juntada. Sin juntadas: un mensaje que invita a crear una (`/nueva`).
- **`/reglas`** (nueva, prerenderizada, pública, sin sesión): "Cómo se juega". Explica en
  lenguaje simple cada regla que suma y cada una que resta (cuándo y cuánto), las ventanas del
  primer voto, las excepciones (unido hace menos de 12 h, juntada cancelada), todas las medallas
  con su condición, y un ejemplo resuelto: "Ana vota a las 3 h (+10 +5), puede en la fecha
  ganadora (+20): 35 puntos. Leo se unió, no votó y se cerró: −15". Cada sección tiene un `id`
  (`#suman`, `#restan`, `#medallas`, `#ejemplo`) para enlazarla.
- **Links a `/reglas`**: desde el panel "Ranking" ("¿Cómo se cuentan?"), desde el aviso de lo que
  está en juego, desde `/perfil` y desde el panel "Con premios" de la landing. Desde el aviso y
  desde un total negativo, el link va a `#restan`.
- **Fuente única de los valores**: los puntos, las ventanas, el tope y la lista de medallas viven
  en un solo módulo, `src/lib/premios.ts`. `/reglas`, el aviso y `/perfil` leen de ahí; ningún
  número de puntos se escribe a mano en una página. La migración repite los valores en SQL, y un
  test (`C13`) verifica que coincidan con el módulo.
- **Barra de `App.astro`**: con sesión, un link "Mi perfil" a `/perfil`. El link "¿Qué es Nos
  Vemos?" sigue apareciendo una sola vez (eval `005·C3`).
- **Vista previa**: se suman `/vista-previa/perfil` y el ranking con medallas en
  `/vista-previa/cerrada`. Siguen sin existir en producción.
- **Landing**: "Con premios" pasa a "Disponible" (`.tag-ok`). El texto pasa a: "Sumás puntos y
  medallas por votar y aparecer, y los perdés si te colgás. Hay ranking en cada juntada. Hasta los
  que dudaban se suman." Quedan
  2 "Próximamente".
- **`/privacidad`**, sección `#datos` y `#uso`: tus puntos y medallas se calculan con tu historial
  de participación, y los ven los participantes de las juntadas en las que estás (solo junto a tu
  nombre).

## Criterios de aceptación y sus evals

Los deterministas van a `evals/run.sh`, una función por criterio. Los evals de las specs 001 a 009
siguen pasando, salvo `006·C1` y los de `007` que cuentan etiquetas, que se actualizan según `C7`
y se registra el cambio en `decisions.md`.

| # | Criterio | Eval |
|---|---|---|
| C1 | Compila y no rompe nada | `npm ci && npm run build` sale con código 0; `evals/run.sh` completo: 0 fallan |
| C2 | La migración tiene la forma pedida | `grep` sobre `003_premios.sql`: sin `create table`; las 2 funciones con `security definer` y `set search_path`; `revoke all` de `public, anon, authenticated` en cada una; no aparecen `leads`, `alter table` ni `drop`. `git diff main -- supabase/migrations/001_leads.sql supabase/migrations/002_juntadas.sql` vacío |
| C3 | Los puntos se calculan bien | `npm run test:db` (aplicando 001, 002 y 003) pasa con, como mínimo: votar una vez → 10 · votar en menos de 24 h → +5 · votar a las 25 h → sin +5 · votar 3 veces en la misma juntada → 10, no 30 · confirmado → +20 · organizador de una cerrada → +30 · votos en una juntada luego cancelada → 0 · primer voto a las 72 h → 10 − 5 = 5 · primer voto a las 71 h → 10 · no votar, unido 13 h antes del cierre → −15 · no votar, unido 11 h antes del cierre → 0 · no votar en una cancelada → 0 · organizador de una cancelada → −15 · 2 cambios de voto en la última hora antes del cierre → −6 · 5 cambios → −9 (tope 3) · cambio de voto 3 h antes del cierre → 0 · alguien con solo penalidades queda con total negativo |
| C4 | Las medallas se ganan bien | `npm run test:db`: `primer_voto` al primer voto · `rayo` al tercer voto rápido, no al segundo · `destrabador` para quien emitió el último voto antes del cierre, y para nadie más en esa juntada · `infaltable` al quinto `confirmado` · `anfitrion` a la tercera cerrada como organizador · `fantasma` al tercer "Te colgaste" · `redencion` al votar en la juntada siguiente a un "Te colgaste", y no si votó en una que no era la siguiente · ninguna medalla se repite · la juntada de origen es la correcta |
| C5 | El ranking es seguro | `npm run test:db`: `ranking_juntada` de una juntada ajena → `no_participante` · código inexistente → `no_existe` · no expone emails (ninguna clave `email` ni ningún valor con `@`) · orden por puntos y, en empate, por `unido_en` · `anon` no puede ejecutar `mis_premios` ni `ranking_juntada` · `mis_premios` de un usuario no incluye juntadas en las que no participa |
| C6 | `/perfil` sin sesión funciona | Playwright contra la app con variables de Supabase falsas: `/perfil` sin sesión muestra "Entrar con Google"; a 375 px sin scroll horizontal |
| C7 | La landing anuncia los premios | En el HTML construido de `/`, `#solucion`: "Cierra solo" y "Con premios" con "Disponible" (`.tag-ok`); "Insiste por vos" y "Se repite" con "Próximamente"; en total 2 y 2; el panel "Con premios" contiene "ranking" |
| C8 | La privacidad lo dice | `/privacidad` construida: `#datos` contiene "puntos" y "medallas"; `#uso` contiene "ranking"; los evals `004·*` pasan |
| C9 | La vista previa no llega a producción | En `.vercel/output` no existen `vista-previa/perfil` ni ninguna ruta `vista-previa` |
| C10 | Se entiende y se ve como Nos Vemos | Rúbrica (abajo) sobre capturas a 375 y 1280 px de `/vista-previa/votar`, `/vista-previa/cerrada`, `/vista-previa/perfil` y `/reglas`, adjuntas al PR |
| C12 | `/reglas` explica todo | En `.vercel/output/static/reglas/index.html`: existen `#suman`, `#restan`, `#medallas` y `#ejemplo`; aparecen los nombres de las 8 reglas y de las 7 medallas de `src/lib/premios.ts` con sus valores (cada valor aparece con signo, p. ej. "+10", "−15"); "24 h", "72 h", "12 h" y "2 h" aparecen. Playwright: a 375 px sin scroll horizontal; los links "¿Cómo se cuentan?" del ranking (en la vista previa), de `/perfil` y de la landing apuntan a `/reglas` |
| C13 | Los valores no se desincronizan | `npm run test:db`: para cada regla de `src/lib/premios.ts`, un escenario en el Postgres embebido da exactamente ese valor; cambiar un valor solo en el módulo hace fallar el test (registrar la mutación en el PR). `grep` en `src/pages` y `src/components`: ningún literal `+10`, `+5`, `+20`, `+30`, `−5`, `−15`, `−3` fuera de `src/lib/premios.ts` |
| C11 | El operador puede ponerla en marcha solo | `README.md` tiene la sección "Migración 003" con los pasos para correr `003_premios.sql` |

### Rúbrica de C10 (pasa si cumple todo)

1. Misma paleta "Atardecer pixel" y tipografías; las medallas usan sprites o íconos pixel del
   pack Kenney CC0 ya incluido, o formas CSS; ningún color nuevo que no pase AA (registrar ratio).
2. En el ranking se ve en dos segundos quién va primero y dónde estoy yo.
3. Las medallas por ganar se leen (no parecen un error) y dicen cómo ganarlas.
3b. Perder puntos se lee como juego, no como castigo: tono con humor, sin rojo a pantalla
   completa; el color de alerta de los negativos pasa AA (registrar ratio). "Fantasma" se
   distingue a simple vista de las medallas buenas.
3c. El aviso de lo que está en juego entra a 375 px sin empujar la grilla fuera de la pantalla.
3d. `/reglas` se entiende sin haber usado Nos Vemos: alguien que llega desde el link del grupo
   sabe en un minuto qué hacer para sumar y qué evitar para no restar.
4. El ranking no tapa la grilla ni el botón de votar en celular: la grilla sigue siendo lo primero.
5. Español rioplatense en todo.
6. Botones y links con contraste AA y área táctil de al menos 44 px en celular.

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-11-19): el ranking es por juntada, entre sus participantes; no hay
  ranking global.
- DECIDIDO por Claudio (2026-11-19): los puntos se basan solo en lo que ya guarda la base (votar,
  votar rápido, confirmado, organizar con éxito); no se pide marcar quién fue.
- DECIDIDO por Claudio (2026-11-19): puntos y medallas se ven en `/j/<código>` y en `/perfil`.
- DECIDIDO por Claudio (2026-11-19): la landing pasa "Con premios" a "Disponible" en esta spec.
- DECIDIDO por Claudio (2026-11-19): hay puntos negativos (no votar, votar tarde, cambiar a
  último momento, cancelar), y el total puede quedar por debajo de 0.
- DECIDIDO por Claudio (2026-11-19): el sitio explica en una página pública cuándo y cuánto suma
  o resta cada acción, enlazada desde todo lugar donde se ven puntos.
- A CONFIRMAR por Claudio en la aprobación: los valores de la tabla "Reglas de puntos" y la
  lista de medallas (nombres y umbrales).

### Delegadas al agente, con criterio

- **Cálculo en SQL**: una función auxiliar interna (sin `execute` para nadie) que calcule los
  puntos por (persona, juntada), reutilizada por las dos funciones públicas. Lo más simple que
  pase `C3`–`C5`.
- **Íconos de medalla**: tiles del pack Kenney ya presente en `public/sprites`; si no alcanzan,
  formas CSS. No se agregan packs nuevos.
- **Componentes**: `.astro` sin isla React salvo que haga falta interactividad.

### Condiciones de parada (el agente para y pregunta)

- Algo exige modificar `001_leads.sql`, `002_juntadas.sql`, una tabla existente o `leads`.
- El cálculo en vivo tarda más de 200 ms en `npm run test:db` con 50 juntadas y 10 personas.
- Hace falta un servicio pago, una cuenta nueva o claves reales.
- Un criterio contradice a otro, o aparece una decisión que ninguna lista cubre.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Ranking global o entre amigos | Aparecen los grupos como entidad, o un grupo de prueba lo pide |
| Marcar quién fue de verdad | Los grupos de prueba dicen que "confirmado" no refleja quién aparece |
| Penalidad por no unirse (gente del grupo que nunca entró) | v2: la base no sabe quiénes son hasta que entran |
| Fecha límite elegida por el organizador para "Voto tardío" | v2 (llega con la fecha límite y los recordatorios) |
| Notificaciones de medallas | v2 (requiere emails) |
| Medallas configurables por el organizador | Un organizador de prueba lo pide |

## Efectos que escapan del sistema

**Ninguno durante la implementación.** Todo se prueba con el Postgres embebido y variables
falsas. Correr `003_premios.sql` en producción y desplegar son actos del operador siguiendo el
README (sección nueva "Migración 003").

## Evidencia de implementación (2026-11-19)

Rama `spec/010-medallas-puntos`. Decisiones: `decisions.md`, entradas del 2026-11-19.

Evals: `evals/run.sh` → 64 pasan · 0 fallan (001–009 intactos; `006·C1` y `007·C2` actualizados a 2 + 2 según C7).

```
PASS 010·C1 el build incluye / y /reglas (el resumen final exige 0 fallas)
PASS 010·C2 003_premios.sql: sin tablas, 5 funciones security definer con search_path y revoke, sin leads/alter/drop; 001 y 002 intactas
PASS 010·C3 puntos: suman, restan, ventanas, excepciones, tope y totales negativos      | Tests 17 passed
PASS 010·C4 medallas: umbrales, Llave final, Fantasma, Redención, sin repetir, juntada de origen | Tests 9 passed
PASS 010·C5 ranking seguro: ajena, inexistente, sin emails, orden, permisos, < 200 ms   | Tests 8 passed
PASS 010·C6 /perfil sin sesión muestra "Entrar con Google" a 375 px sin scroll horizontal
PASS 010·C7 Cierra solo y Con premios Disponible (.tag-ok), las otras dos Próximamente, Con premios menciona ranking
PASS 010·C8 /privacidad: #datos nombra puntos y medallas, #uso el ranking
PASS 010·C9 ni vista-previa/perfil ni ninguna vista-previa en .vercel/output
PASS 010·C11 README con la sección Migración 003
PASS 010·C12 /reglas: #suman #restan #medallas #ejemplo, 8 reglas con valor, 7 medallas, ventanas; links a /reglas
PASS 010·C13 la base da exactamente los valores de src/lib/premios.ts; sin literales de puntos en páginas | Tests 9 passed
PASS 010·C10.3b contraste AA de los colores de premios (9 pares, mínimo 5.74:1)
```

- C13, mutación: `te_colgaste` a -20 solo en `premios.ts` → `AssertionError: expected [ 'te_colgaste', -15 ] to deeply equal [ 'te_colgaste', -20 ]`; revertida, pasa.
- Desvíos registrados en `decisions.md`: la base devuelve ids de medalla (no nombres); guion ASCII en los negativos; barra en dos líneas a 375 px; `wc -l` portable en `evals/run.sh`.

### C10 — rúbrica

Capturas (scratchpad de la sesión, fuera del repo), página completa a 375 y 1280 px: `/private/tmp/claude-501/-Users-claudio-Library-Application-Support-Claude-scratch-workspaces-7ebd45db-63c5-4a57-ac74-b93abebba1c7-21dfaaea-071b-43fb-9375-dd68e91a045a-scratch-2026-11-20-6b2add/7e43140f-88f9-4aa0-9c47-7740b63ae498/scratchpad/spec010/{votar,cerrada,perfil,reglas}-{375,1280}.png` y `/private/tmp/claude-501/-Users-claudio-Library-Application-Support-Claude-scratch-workspaces-7ebd45db-63c5-4a57-ac74-b93abebba1c7-21dfaaea-071b-43fb-9375-dd68e91a045a-scratch-2026-11-20-6b2add/7e43140f-88f9-4aa0-9c47-7740b63ae498/scratchpad/spec010/landing-solucion-{375,1280}.png`.

| Ítem | Resultado | Evidencia |
|---|---|---|
| 1. Paleta, tipografías, medallas pixel | Pasa | Tokens de `global.css`; medallas en SVG pixel propio (`MedallaIcono.astro`, sin packs nuevos); coral `#f29e8e` ya existente, ratios en `decisions.md` |
| 2. Primero y "yo" en dos segundos | Pasa | Posición 1 en rosa; fila propia con borde lavanda y "(vos)" |
| 3. Medallas por ganar | Pasa | Ícono apagado y borde punteado, con la condición escrita; no parecen error |
| 3b. Perder como juego | Pasa | "-15 Ñata se colgó" en caja punteada, sin rojo a pantalla completa; Fantasma con ícono de fantasma gris, distinto de las medallas |
| 3c. Aviso a 375 px | Pasa | Tres líneas bajo la grilla, arriba del botón; las fechas siguen en la primera pantalla |
| 3d. /reglas se entiende | Pasa | Qué suma / qué resta con el valor a la izquierda, tabla de ventanas, excepciones y ejemplo con Ana, Sofi y Leo |
| 4. Grilla primero | Pasa | El ranking va después del panel de votación (también lo verifica `premios.spec.ts`) |
| 5. Rioplatense | Pasa | "Votá", "te colgaste", "Creá tu juntada" |
| 6. AA y 44 px | Pasa | Contrastes ≥ 5.74:1; botones de 48 px; índice de `/reglas` e historial con 44 px de alto |
