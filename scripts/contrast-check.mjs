// Contraste WCAG 2.x de los pares texto/fondo de las etiquetas de estado, leídos de global.css.
// Sale con código 1 si algún par está por debajo de 4.5:1.
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

let failed = false;
for (const [label, text, bg] of [
  ['Disponible', v('status-ok-text'), v('status-ok-bg')],
  ['Próximamente', v('status-soon-text'), v('status-soon-bg')],
]) {
  const r = ratio(text, bg);
  console.log(`${label}: ${text} sobre ${bg} = ${r.toFixed(2)}:1`);
  if (r < 4.5) failed = true;
}
process.exit(failed ? 1 : 0);
