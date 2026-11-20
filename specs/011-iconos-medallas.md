---
status: aprobada
depends_on: [010]
---

# 011 — Cada medalla tiene su propio ícono

Hoy las seis medallas buenas comparten el mismo ícono (disco con cinta) y solo "Fantasma" es
distinta. Cada medalla pasa a tener un ícono pixel propio que cuenta lo que premia.

**Tipo**: feature (visual) · **Flujo**: design-first

## Estado previo

`src/components/app/MedallaIcono.astro` dibuja dos SVG de 10×10 en `currentColor`: medalla con
cinta (todas) o fantasma (`verguenza`). Lo usan `Ranking.astro` (anuncios de LEVEL CLEAR y la
cantidad de medallas por fila), `Perfil.astro` y `src/pages/reglas.astro`. La lista de medallas
vive en `src/lib/premios.ts` (`MEDALLAS`). Colores en `app.css`, sección "Premios".

## Qué se construye

1. **Un ícono por medalla**, SVG pixel de 10×10 con `shape-rendering="crispEdges"`, dos colores
   (principal y detalle):

| Medalla | Ícono | Principal | Detalle |
|---|---|---|---|
| Player 1 (`primer_voto`) | Joystick | `--accent` `#c4b5fd` | `--title` `#edf2f7` |
| Rayo (`rayo`) | Rayo con chispas | `--status-soon-bg` `#fef08a` | `--tagline` `#f6b8c8` |
| Llave final (`destrabador`) | Llave | `#fef08a` | `--accent` |
| Infaltable (`infaltable`) | Corazón | coral `#f29e8e` | `--title` |
| Anfitrión (`anfitrion`) | Casa | `--tagline` | `--accent` (techo) |
| Fantasma (`fantasma`) | Fantasma (el actual) | `--muted` `#a0aec0` | — |
| Redención (`redencion`) | Flecha hacia arriba con chispas | `--status-ok-bg` `#bbf7d0` | `#fef08a` |

2. **Apagada** (medalla por ganar en `/perfil`): el mismo dibujo, todo en `--border` `#4a4672`.
3. **Dónde**: `MedallaIcono` recibe `medalla: MedallaId` y dibuja el que corresponde. Se usa en
   `/perfil`, `/reglas` y los anuncios de LEVEL CLEAR. En la fila del ranking, donde va una
   cantidad ("3 medallas"), queda un ícono genérico: el de Player 1.
4. **El dibujo vive en un solo lugar**: los trazados de cada ícono se definen una vez, en
   `MedallaIcono.astro` (o un módulo que importe), indexados por `MedallaId`.

## Criterios de aceptación y sus evals

Los evals de las specs 001 a 010 siguen pasando.

| # | Criterio | Eval |
|---|---|---|
| C1 | Compila y no rompe nada | `npm run build` sale con código 0; `evals/run.sh` completo: 0 fallan |
| C2 | Siete íconos distintos | En `.vercel/output/static/reglas/index.html`, `#medallas` tiene 7 `<svg>` y los 7 tienen trazados (`d` concatenados) distintos entre sí |
| C3 | Cada medalla tiene ícono | Un test de Vitest recorre `MEDALLAS` de `premios.ts` y verifica que exista un ícono para cada id (si se agrega una medalla sin ícono, falla) |
| C4 | Apagadas en un solo color | En `/vista-previa/perfil`, los íconos de las medallas por ganar solo usan `#4a4672` (o `var(--border)`) y el fondo para los huecos |
| C5 | Se ven bien | Rúbrica sobre capturas a 375 y 1280 px de `/reglas`, `/vista-previa/perfil` y `/vista-previa/cerrada`: (1) cada ícono se reconoce a 32 px y se distingue de los demás a 18 px; (2) contraste no textual ≥ 3:1 del color principal sobre `--bg` y `--panel` (registrar ratios); (3) Fantasma sigue leyéndose como la medalla de la vergüenza; (4) misma estética pixel que la mascota |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-11-20): cada medalla tiene un ícono distinto.
- A CONFIRMAR por Claudio en la aprobación: los dibujos y colores de la tabla (vistos en la
  maqueta de la sesión).

### Delegadas al agente, con criterio

- **Ajustes de píxeles** que mejoren la lectura a 18 px sin cambiar la idea del ícono.

### Condiciones de parada

- Algo exige tocar la base, `premios.ts` (salvo importar sus tipos) o las reglas de puntos.
- Un color nuevo fuera de la paleta y de los ya usados en la app.

## Fuera de alcance

| Fuera | Se reactiva si |
|---|---|
| Íconos animados | Los grupos de prueba lo piden |
| Sprites PNG en vez de SVG | Se suma un pack de íconos con licencia |

## Efectos que escapan del sistema

Ninguno: solo cambia el front. No hay migración.
