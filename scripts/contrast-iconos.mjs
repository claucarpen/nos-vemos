// Spec 011, C5.2: contraste no textual (>= 3:1) del color principal de cada ícono de medalla
// sobre el fondo (--bg) y los paneles (--panel). Lee los íconos de src/lib/iconos-medallas.ts.
// Uso: node --experimental-strip-types scripts/contrast-iconos.mjs
const { ICONOS } = await import('../src/lib/iconos-medallas.ts');

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
for (const [id, { principal }] of Object.entries(ICONOS)) {
  const r = [['bg', '#1e1b3a'], ['panel', '#2c2950']].map(([n, bg]) => [n, ratio(principal, bg)]);
  console.log(`${id}: ${principal} ${r.map(([n, x]) => `${n} ${x.toFixed(2)}:1`).join(', ')}`);
  if (r.some(([, x]) => x < 3)) failed = true;
}
process.exit(failed ? 1 : 0);
