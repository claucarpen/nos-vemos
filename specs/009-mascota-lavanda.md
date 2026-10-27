---
status: en curso
depends_on: [008]
---

# 009 — La mascota pasa a la versión Lavanda

La mascota del sitio cambia a la variante "Lavanda": la misma figura, con la armadura en los lilas
de la paleta. El favicon se regenera desde la mascota nueva. Es solo un cambio de imagen.

**Tipo**: residuals · **Flujo**: requirements-first

## Estado previo

- `public/sprites/mascot.png`: tile 98 de Tiny Dungeon (Kenney, CC0), 16×16, colores originales.
  La usan `src/pages/index.astro` (hero y preload), `src/layouts/App.astro` y `src/pages/privacidad.astro`.
- `public/favicon.png` y `public/favicon.ico` salen de `node scripts/make-favicon.mjs` (mascota ×2).
  El eval C12 (`tests/e2e/favicon.spec.ts`) verifica que coincidan píxel a píxel.
- `decisions.md` (2026-10-13): "Mascota v0 con los colores originales del pack". La invalidaría
  que el operador entregue una mascota propia.

## Qué se construye

1. Reemplazar `public/sprites/mascot.png` por el PNG entregado, byte a byte.
2. Correr `node scripts/make-favicon.mjs` para regenerar `favicon.png` y `favicon.ico`.
3. Agregar a `decisions.md` la entrada "2026-10-27 · Mascota v1 Lavanda", que reemplaza a la v0.
4. Nada más cambia: el nombre del archivo, el tamaño, las posiciones, la animación y el código de
   las páginas quedan igual.

**Fuente**: `/home/claudio/Escritorio/mi-brain/initiatives/portal-juntadas/mascota/mascota-lavanda.png`.

## Criterios de aceptación y sus evals

Todos los evals de las specs 001 a 008 siguen pasando (`evals/run.sh`).

| # | Criterio | Eval |
|---|---|---|
| C1 | La mascota es exactamente la entregada | `cmp public/sprites/mascot.png <fuente>`, que sale sin diferencias |
| C2 | Solo cambió la armadura | Script que compara la mascota nueva con el tile original (`git show 83a7e2d:public/sprites/mascot.png`). Los únicos píxeles distintos son los de `#c0cbdc`→`#c4b5fd`, `#8b9bb4`→`#8b84b8` y `#52607c`→`#4a4672`; la transparencia es idéntica |
| C3 | El favicon es la mascota nueva | C12 existente (`favicon.spec.ts`) pasa, y `favicon.png` difiere del de `main` |
| C4 | Se ve bien | Capturas del hero a 375 y 1280 px y de la barra de `/nueva`, inspeccionadas: la mascota se lee como el mismo personaje, se distingue sobre el cielo y nada se corta |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (Gate 1, 2026-10-27): variante "Lavanda", con armadura en `#c4b5fd` /
  `#8b84b8` / `#4a4672`. Descartadas "Atardecer" y "Lavanda + pelo coral".
- El PNG se usa tal cual: no se retoca, no se re-exporta y no se le cambia el tamaño.

### Delegadas al agente, con criterio

- **Redacción de la entrada en `decisions.md`**: el mismo formato que las demás (Qué se decide /
  Por qué / La invalidaría).

### Condiciones de parada

- Si C2 encuentra píxeles distintos fuera de esos tres colores: no corregir, reportar.
- Si algo exige tocar código o estilos.

## Efectos que escapan del sistema

Ninguno: el cambio queda en una rama sin push. Publicarlo es el merge que hace Claudio.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Accesorio o logo en la mascota | Claudio entrega un `.piskel` retocado |
| Recolorear a los amigos del hero | Al verla en el sitio, la mascota no se distingue de los amigos |
