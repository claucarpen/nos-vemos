// 008·C5: los @keyframes del CSS construido solo animan transform y opacity.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = '.vercel/output/static/_astro';
const css = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
const allowed = new Set(['transform', 'opacity', 'animation-timing-function']);
const bad = [];
let blocks = 0;
for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
  let depth = 1, i = m.index + m[0].length;
  const start = i;
  while (depth > 0 && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
  blocks++;
  for (const d of css.slice(start, i - 1).matchAll(/\{([^{}]*)\}/g)) {
    for (const decl of d[1].split(';')) {
      const prop = decl.split(':')[0].trim();
      if (prop && !allowed.has(prop)) bad.push(`${m[1]}: ${prop}`);
    }
  }
}
if (blocks === 0) { console.error('sin @keyframes en el CSS construido'); process.exit(1); }
if (bad.length) { console.error(`propiedades animadas no permitidas: ${bad.join(', ')}`); process.exit(1); }
console.log(`${blocks} @keyframes, solo transform y opacity`);
