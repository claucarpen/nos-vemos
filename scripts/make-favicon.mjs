// Genera public/favicon.png (32x32) y public/favicon.ico desde public/sprites/mascot.png:
// cada píxel de la mascota se vuelve un bloque de 2x2 idéntico (vecino más cercano). Sin dependencias.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const src = readFileSync('public/sprites/mascot.png');
const chunks = {};
const idat = [];
for (let o = 8; o < src.length; ) {
  const len = src.readUInt32BE(o), type = src.toString('latin1', o + 4, o + 8);
  const data = src.subarray(o + 8, o + 8 + len);
  if (type === 'IDAT') idat.push(data); else chunks[type] = data;
  o += 12 + len;
}
const w = chunks.IHDR.readUInt32BE(0), h = chunks.IHDR.readUInt32BE(4);
const depth = chunks.IHDR[8], ctype = chunks.IHDR[9];
if (chunks.IHDR[12] !== 0) throw new Error('PNG entrelazado no soportado');
const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
const bpp = Math.max(1, (channels * depth) >> 3), stride = Math.ceil((w * channels * depth) / 8);
const raw = inflateSync(Buffer.concat(idat));
const px = Buffer.alloc(stride * h);
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)];
  for (let i = 0; i < stride; i++) {
    const x = raw[y * (stride + 1) + 1 + i];
    const a = i >= bpp ? px[y * stride + i - bpp] : 0, b = y ? px[(y - 1) * stride + i] : 0, c = i >= bpp && y ? px[(y - 1) * stride + i - bpp] : 0;
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
    px[y * stride + i] = (x + pred) & 255;
  }
}
const rgba = (x, y) => {
  if (ctype === 6 && depth === 8) { const k = y * stride + x * 4; return [px[k], px[k + 1], px[k + 2], px[k + 3]]; }
  if (ctype !== 3) throw new Error('tipo de PNG no soportado');
  const bit = x * depth, idx = (px[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  const pal = chunks.PLTE, t = chunks.tRNS;
  return [pal[idx * 3], pal[idx * 3 + 1], pal[idx * 3 + 2], t && idx < t.length ? t[idx] : 255];
};

const N = w * 2, out = Buffer.alloc(N * N * 4);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out.set(rgba(x >> 1, y >> 1), (y * N + x) * 4);

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const t = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(t));
  return Buffer.concat([l, t, c]);
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
const scan = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) out.copy(scan, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(scan, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
writeFileSync('public/favicon.png', png);

// ICO con una sola imagen: el mismo PNG de 32x32
const dir = Buffer.alloc(22);
dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(1, 4);
dir[6] = N; dir[7] = N; dir.writeUInt16LE(1, 10); dir.writeUInt16LE(32, 12);
dir.writeUInt32LE(png.length, 14); dir.writeUInt32LE(22, 18);
writeFileSync('public/favicon.ico', Buffer.concat([dir, png]));
