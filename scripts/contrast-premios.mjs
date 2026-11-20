// Contraste WCAG 2.x de los pares texto/fondo nuevos de la spec 010 (puntos, ranking, medallas).
// Los colores salen de global.css (tokens) y de app.css (literales de la paleta). Sale con 1 si
// algún par queda por debajo de 4.5:1.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const v = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`falta --${name}`);
  return m[1];
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const CORAL = '#f29e8e'; // negativos (ya usado en .alerta)
const FILA_YO = '#2d2a5a'; // fila propia del ranking
const MEDALLA = '#4a3a7e'; // fondo de "¡X ganó …!"

let failed = false;
for (const [label, text, bg] of [
  ['Negativo sobre fondo', CORAL, v('bg')],
  ['Negativo sobre panel', CORAL, v('panel')],
  ['Negativo en mi fila', CORAL, FILA_YO],
  ['Positivo sobre fondo', v('tagline'), v('bg')],
  ['Positivo en mi fila', v('tagline'), FILA_YO],
  ['Nombre de medalla ganada', v('tagline'), MEDALLA],
  ['Texto de medalla ganada', v('title'), MEDALLA],
  ['Link del aviso', v('accent'), v('bg')],
  ['Texto atenuado sobre fondo', v('muted'), v('bg')],
]) {
  const r = ratio(text, bg);
  console.log(`${label}: ${text} sobre ${bg} = ${r.toFixed(2)}:1`);
  if (r < 4.5) failed = true;
}
process.exit(failed ? 1 : 0);
