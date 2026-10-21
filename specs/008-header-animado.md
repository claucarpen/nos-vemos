---
status: pendiente
depends_on: [002, 005]
---

# 008 — El header cobra vida: llegan los amigos y se cierra la juntada

Animar la escena pixel del header con CSS para que cuente la historia del producto: llegan amigos
caminando, se juntan alrededor de la mascota y, cuando llega el último, aparece "LEVEL CLEAR". El
ambiente se mueve todo el tiempo (estrellas, luciérnagas, árboles, la mascota respira). Sin
librerías nuevas, liviano y quieto para quien pide reducir el movimiento.

**Tipo**: feature · **Flujo**: requirements-first

## Estado previo

Ver `ARCHITECTURE.md`, sección "Escenario del hero": cada sprite de `.world` se ubica con `--x`
(unidades de tile desde el centro) y `--u` (48 px hasta 639 px, 64 px desde 640 px), con clases
`wN` por ancho mínimo; `tests/e2e/hero-clipping.spec.ts` verifica que ningún sprite quede cortado
de 320 a 1920 px. Sprites: Tiny Town y Tiny Dungeon (Kenney, CC0). Estrellas: cuadrados CSS en la
banda oscura. Hoy nada se mueve.

## Qué se construye

1. **Historia en loop de 12 s** (CSS `@keyframes`):
   - 0-6 s: entran **3 amigos** (personajes de Tiny Dungeon distintos de la mascota, con sus
     colores originales), uno por vez, caminando por el camino de tierra desde posiciones laterales
     hasta quedar junto a la mascota. Caminan "a saltitos" pixel (`steps()`), sin interpolación
     borrosa.
   - Cada llegada: un cartelito pixel chico "P2", "P3", "P4" sobre el que llega, 1 s.
   - 6 s: con el último, destello pixel y cartel **"LEVEL CLEAR"** sobre el grupo, 2 s.
   - 9-12 s: los amigos se desvanecen y el ciclo vuelve a empezar.
2. **Ambiente continuo**: estrellas que titilan (desfasadas), 4-6 luciérnagas (puntos de 1 tile/8
   de luz amarilla suave) que flotan sobre el pasto, árboles que se mecen ±1 px, la mascota sube y
   baja 1 px cada ~1 s.
3. **Reglas técnicas**:
   - Solo se animan `transform` y `opacity`.
   - `@media (prefers-reduced-motion: reduce)`: ninguna animación; se muestra la escena final
     quieta (los 3 amigos junto a la mascota, sin cartel).
   - Un `IntersectionObserver` agrega una clase que pausa todas las animaciones
     (`animation-play-state: paused`) cuando el header sale de la vista.
   - Los elementos animados no cambian el tamaño ni la posición del layout (sin saltos).
   - Todo lo agregado es decorativo: `aria-hidden="true"`, y el cartel "LEVEL CLEAR" no se anuncia.
   - En cada fotograma, ningún sprite queda cortado por el borde de la pantalla: los caminos de
     entrada empiezan dentro de la zona visible de su ancho (siguiendo los tiers `wN`), apareciendo
     con `opacity`.
4. Los sprites nuevos van a `public/sprites/` con la licencia de Tiny Dungeon que ya está ahí.

## Criterios de aceptación y sus evals

Todos los evals de las specs 001 a 007 siguen pasando.

| # | Criterio | Eval |
|---|---|---|
| C1 | Hay animación | Playwright sobre `/` a 1280 px: al menos 8 elementos de `.world`/hero con `animation-name` distinto de `none`; existen 3 sprites de amigos nuevos y el cartel "LEVEL CLEAR" en el DOM con `aria-hidden="true"` |
| C2 | Respeta "reducir movimiento" | Playwright con `reducedMotion: 'reduce'`: ningún elemento del hero tiene animación activa (`animation-name: none` o duración 0); los 3 amigos son visibles y el cartel no |
| C3 | Se pausa fuera de la vista | Playwright: con el header a la vista, `animation-play-state` es `running`; tras hacer scroll hasta `#form-leads`, es `paused` en todos los elementos animados |
| C4 | No mueve el layout | Playwright: durante 13 s en `/`, la suma de `layout-shift` (PerformanceObserver) es ≤ 0.01 |
| C5 | Solo `transform` y `opacity` | Script que parsea los `@keyframes` del CSS construido del hero: ninguna propiedad animada fuera de `transform` y `opacity` |
| C6 | Nada cortado, en ningún momento | `hero-clipping.spec.ts` se extiende: a 320, 375, 640, 880, 1280 y 1920 px, muestrea 6 instantes del loop y verifica que ningún sprite visible (`opacity` > 0) quede parcialmente fuera del viewport |
| C7 | Sin dependencias nuevas | `package.json` del branch tiene las mismas `dependencies` y `devDependencies` que `main` |
| C8 | Se entiende y no distrae | Rúbrica sobre un video de un loop completo a 1280 px y otro a 375 px (Playwright `recordVideo`, en el scratchpad) y capturas de 4 instantes: (1) se lee "llegan amigos → se juntan → LEVEL CLEAR"; (2) movimiento pixel nítido, sin desenfoque; (3) el botón "Creá tu juntada" sigue siendo lo más claro del header; (4) nada parpadea más de 3 veces por segundo; (5) en celular se entiende igual |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-20), a partir del feedback del profesor: animar el header con CSS
  (opción A). Descartados Canvas 2D y Three.js + WebGPU (TSL/WGSL): peso, compatibilidad y
  mantenimiento desproporcionados para una escena pixel 2D.
- DECIDIDO por Claudio (2026-10-20): la animación cuenta la historia "llegan los amigos y se
  completa el quórum", con loop de 12 s.

### Delegadas al agente, con criterio

- **Qué personajes de Tiny Dungeon**: 3 distintos entre sí y de la mascota, que se lean como
  "amigos" (preferir humanos, evitar monstruos y fantasmas).
- **Posiciones exactas y tiempos finos**: los que pasen C6 en todos los anchos y la rúbrica C8.
- **Luciérnagas**: CSS puro (cuadrados de color), sin sprites nuevos.

### Condiciones de parada

- Si C6 no se puede cumplir con los caminos de entrada en algún ancho sin cambiar el escenario.
- Si alguna animación exige librerías o JavaScript más allá del `IntersectionObserver`.
- Si algo exige tocar la v1, el formulario o los textos.
- Contradicción entre criterios o una decisión que ninguna lista cubre.

## Efectos que escapan del sistema

Ninguno.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Animaciones de caminar con varios frames por personaje | Hay sprites con ciclos de caminata (Kenney u otro pack CC0 compatible) |
| Interacción (hover/clic sobre personajes) | La animación base funciona y queda tiempo |
| Sonido | Nunca en la landing sin que el usuario lo active |
| Efectos 3D/WebGPU | Aparece una necesidad que el 2D no cubra |
