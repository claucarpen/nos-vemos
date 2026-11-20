# Correr los evals en macOS: lo que no se deduce del código

- `wc -l` de BSD rellena con espacios a la izquierda: comparar su salida como texto falla con valores correctos. Recortar con `tr -d ' '` o comparar como número.
- `sed -i` en macOS exige un argumento de extensión (`sed -i ''`); en GNU no. Los evals no usan `sed -i`; los scripts de una sola vez sí lo necesitan.
- Playwright necesita su Chromium por máquina: `npx playwright install chromium` la primera vez (sin eso todos los tests de Playwright fallan con "Executable doesn't exist").
- `astro check` no corre con TypeScript 7 (pide TS 6); el build de Astro y los tests son el chequeo que queda.
- `node --experimental-strip-types` importa `src/lib/premios.ts` directo desde bash (lo usa `010·C12`).
