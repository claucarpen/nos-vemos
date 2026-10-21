---
status: implementada
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

## Evidencia

Evals: `evals/run.sh` → 51 pasan · 0 fallan (`008·C1`–`008·C7` y `008·C6b`; 001–007 intactos; `C15` pasa de 28 a 31 sprites). C1 a C4 y C6b: `tests/e2e/hero-animacion.spec.ts`. C5: `scripts/check-keyframes.mjs`. C6: `tests/e2e/hero-clipping.spec.ts` (pausa todas las animaciones y fija `currentTime` en 0,5; 2,2; 4,2; 6,2; 8 y 10,5 s). Mutaciones comprobadas: `--sl: -6` a 320 px rompe C6; `--x` del primer amigo en -1.9 a 700 px rompe C2 y C6b. C7: compara con `git show main:package.json`.

Cambio posterior a la revisión del operador (ver `decisions.md`, "posiciones finales sin superposición y 2 amigos en pantallas chicas"): finales sin superposición; bajo 700 px, 2 amigos; cada amigo camina al menos 1,5 tiles. `C1` afirma 3 amigos a 1280 y 700 px y 2 a 375 y 699 px; `C2` lo afirma en reduced motion a 320, 375, 699, 700 y 1280 px; `C6b` mide, a 320, 375, 640, 699, 700, 880, 1280 y 1920 px, que en el instante de LEVEL CLEAR ninguna caja de mascota, cofre, poción o amigo visible se superpone y que cada amigo camina al menos 1,5 tiles.

Suelo (pedido posterior del operador): `.ground-grass` `#84c669` y `.ground-dirt` `#eaa56c` (colores únicos de `town_0` y `town_25`) bajo los tiles, más `preload` de imágenes. Eval `008·C9`: con `/sprites/` abortado, los colores computados son esos y un píxel de la captura en cada fila coincide. Primer cuadro del video con los sprites retrasados 400 ms: `spec008/video-first-frame-1280.png` (pasto y tierra presentes).

Personajes: tiles 99 (`friend-p2`), 100 (`friend-p3`) y 85 (`friend-p4`) de Tiny Dungeon (descargado de kenney.nl; la mascota es el tile 98). Hoja de candidatos: `spec008/candidatos.png`.

### C8 — rúbrica

Archivos (scratchpad de la sesión, fuera del repo): `spec008/video-1280/*.webm`, `spec008/video-375/*.webm`, capturas `spec008/shot-1280-{1,4,6_5,10}s.png`, `spec008/shot-375-{1,4,6_5,10}s.png`, `spec008/shot-320-6_5s.png`, `spec008/shot-1280-reduced.png` y las hojas `spec008/sheet-1280.png` y `spec008/sheet-375.png`.

| Ítem | Resultado | Evidencia |
|---|---|---|
| 1. Se lee "llegan amigos → se juntan → LEVEL CLEAR" | Pasa | 1280 px: 1 s llega la primera amiga; 4 s dos amigos a la izquierda del cofre y "P3"; 6,5 s los tres alrededor de la mascota (dos a la izquierda del cofre, uno a la derecha de la poción), "P4" y "LEVEL CLEAR"; 10 s se desvanecen. 375 px: 2 amigos que cruzan el camino, "P3" a los 3 s y "LEVEL CLEAR" a los 6,5 s con los dos amigos a los lados |
| 2. Movimiento pixel nítido | Pasa | `image-rendering: pixelated`, avance con `steps()` de 0,1 s, saltitos de 1 px de sprite; sin bordes borrosos en las capturas (solo el desvanecimiento de opacidad, 9 a 11 s) |
| 3. "Creá tu juntada" sigue siendo lo más claro | Pasa | Es el único bloque lavanda claro del header y no se anima; lo animado está debajo |
| 4. Nada parpadea más de 3 veces por segundo | Pasa | Estrellas: 2 cambios de opacidad cada 2,7 a 4,3 s; luciérnagas: 2 cada 3,3 a 4,5 s; carteles y destello: una vez por loop |
| 5. En celular se entiende igual | Pasa | 375 y 320 px: los dos amigos, "P3" y "LEVEL CLEAR" se ven enteros, sin pisar el cofre ni la poción; cada amigo recorre al menos 1,5 tiles (C6b) |

Con `prefers-reduced-motion: reduce` (`shot-1280-reduced.png`): los tres amigos en su sitio, sin carteles ni destello; a menos de 700 px, dos.
