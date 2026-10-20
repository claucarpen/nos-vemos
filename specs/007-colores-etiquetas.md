---
status: pendiente
depends_on: [006]
---

# 007 — Colores de estado para las etiquetas Disponible y Próximamente

Las etiquetas de la sección `#solucion` pasan a tener colores de estado: verde clarito para
"Disponible" (listo) y amarillo clarito para "Próximamente" (en camino). Es solo estilo.

**Tipo**: residuals · **Flujo**: requirements-first

## Estado previo

`src/styles/global.css`: `.tag-ok` usa el acento lavanda (`var(--accent)`) de fondo y
`.tag-soon` es transparente con borde (`var(--border-input)`). Ver spec 006.

## Qué se construye

1. `.tag-ok` ("Disponible"): fondo `#bbf7d0`, texto `#14532d`, borde del mismo color que el fondo.
2. `.tag-soon` ("Próximamente"): fondo `#fef08a`, texto `#713f12`, borde del mismo color que el fondo.
3. Los colores se declaran como variables CSS nuevas (por ejemplo `--status-ok-bg`,
   `--status-ok-text`, `--status-soon-bg`, `--status-soon-text`) junto a las demás del `:root`.
4. Nada más cambia: textos, orden, tamaño y posición de las etiquetas quedan como en la spec 006.

## Criterios de aceptación y sus evals

Todos los evals de las specs 001 a 006 siguen pasando.

| # | Criterio | Eval |
|---|---|---|
| C1 | Los colores son exactamente los pedidos | `grep` en `src/styles/global.css`: aparecen `#bbf7d0`, `#14532d`, `#fef08a` y `#713f12` como valores de variables del `:root`; `.tag-ok` y `.tag-soon` usan esas variables para `background` y `color` |
| C2 | Se aplican en la página | Playwright sobre `/`: el `background-color` computado de la etiqueta "Disponible" es `rgb(187, 247, 208)` y su `color` es `rgb(20, 83, 45)`; el de cada "Próximamente" es `rgb(254, 240, 138)` con `color` `rgb(113, 63, 18)` |
| C3 | Contraste AA | Script que calcula el contraste WCAG de cada par texto/fondo: ambos ≥ 4.5; registrar los ratios en la spec |
| C4 | Se ve bien | Captura de `#solucion` a 375 y 1280 px, inspeccionada: las dos etiquetas se distinguen por color, se leen bien y no rompen el layout |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-19): verde clarito `#bbf7d0` / `#14532d` para "Disponible" y
  amarillo clarito `#fef08a` / `#713f12` para "Próximamente". Colores de estado fuera de la paleta
  "Atardecer pixel", aceptados porque comunican estado y pasan AA.

### Delegadas al agente, con criterio

- **Nombres de las variables**: los más claros, siguiendo el estilo de las existentes.

### Condiciones de parada

- Si algún par no llega a 4.5:1 (no ajustar el color por cuenta propia: reportar).
- Si algo exige tocar otra cosa que los estilos de las etiquetas.

## Efectos que escapan del sistema

Ninguno.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Usar los colores de estado en la app (`/nueva`, `/j/…`) | Aparece un estado que mostrar ahí (p. ej. juntada abierta/cerrada con color) |
