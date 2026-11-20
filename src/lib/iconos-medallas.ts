// Íconos pixel de las medallas (spec 011): un SVG de 10×10 por medalla, definido una sola vez.
// Cada capa es un trazado con un color de la paleta (ver global.css y app.css). `HUECO` es el
// fondo de la app y queda igual en la versión apagada; el resto pasa a `APAGADA`.
import type { MedallaId } from './premios';

export const HUECO = '#1e1b3a'; // --bg
export const APAGADA = '#4a4672'; // --border

const ACCENT = '#c4b5fd';
const TITLE = '#edf2f7';
const TAGLINE = '#f6b8c8';
const MUTED = '#a0aec0';
const CORAL = '#f29e8e';
const AMARILLO = '#fef08a'; // --status-soon-bg
const VERDE = '#bbf7d0'; // --status-ok-bg

export type Capa = { color: string; d: string };
export type Icono = { principal: string; capas: Capa[] };

export const ICONOS: Record<MedallaId, Icono> = {
  // Joystick: el primer voto es apretar "start".
  primer_voto: {
    principal: ACCENT,
    capas: [
      { color: ACCENT, d: 'M2 3h6v1H2zM1 4h8v3H1zM1 7h3v1H1zM6 7h3v1H6z' },
      { color: HUECO, d: 'M3 4h1v3H3zM2 5h3v1H2z' },
      { color: TITLE, d: 'M6 4h1v1H6zM7 5h1v1H7zM4 1h2v1H4zM5 2h1v1H5z' },
    ],
  },
  // Rayo con chispas: votar rápido.
  rayo: {
    principal: AMARILLO,
    capas: [
      { color: AMARILLO, d: 'M5 0h3v1H5zM4 1h3v1H4zM3 2h3v1H3zM2 3h3v1H2zM2 4h6v1H2zM5 5h2v1H5zM4 6h2v1H4zM3 7h2v1H3zM3 8h1v2H3z' },
      { color: TAGLINE, d: 'M7 1h1v1H7zM1 7h1v1H1zM8 7h1v1H8z' },
    ],
  },
  // Llave: tu voto destrabó la juntada.
  destrabador: {
    principal: AMARILLO,
    capas: [
      { color: AMARILLO, d: 'M1 2h3v1H1zM0 3h1v3H0zM4 3h1v3H4zM1 6h3v1H1zM5 4h5v1H5zM7 5h1v2H7zM9 5h1v2H9z' },
      { color: ACCENT, d: 'M1 3h3v3H1z' },
      { color: HUECO, d: 'M2 4h1v1H2z' },
    ],
  },
  // Corazón: siempre estás.
  infaltable: {
    principal: CORAL,
    capas: [
      { color: CORAL, d: 'M1 2h3v1H1zM6 2h3v1H6zM0 3h10v3H0zM1 6h8v1H1zM2 7h6v1H2zM3 8h4v1H3zM4 9h2v1H4z' },
      { color: TITLE, d: 'M2 3h1v1H2zM1 4h1v1H1z' },
    ],
  },
  // Casa: organizás vos.
  anfitrion: {
    principal: TAGLINE,
    capas: [
      { color: ACCENT, d: 'M4 1h2v1H4zM3 2h4v1H3zM2 3h6v1H2zM1 4h8v1H1z' },
      { color: TAGLINE, d: 'M2 5h6v4H2z' },
      { color: HUECO, d: 'M4 7h2v2H4z' },
      { color: AMARILLO, d: 'M3 5h1v1H3zM6 5h1v1H6z' },
    ],
  },
  // Fantasma: la medalla de la vergüenza.
  fantasma: {
    principal: MUTED,
    capas: [
      { color: MUTED, d: 'M3 1h4v1H3zM2 2h6v6H2zM2 8h1v1H2zM4 8h2v1H4zM7 8h1v1H7z' },
      { color: HUECO, d: 'M3 4h1v1H3zM6 4h1v1H6z' },
    ],
  },
  // Flecha hacia arriba con chispas: volviste.
  redencion: {
    principal: VERDE,
    capas: [
      { color: VERDE, d: 'M4 1h2v1H4zM3 2h4v1H3zM2 3h6v1H2zM4 4h2v5H4z' },
      { color: AMARILLO, d: 'M1 6h1v1H1zM8 5h1v1H8zM0 9h1v1H0zM8 8h1v1H8z' },
    ],
  },
};

// Capas listas para dibujar: apagada = todo en APAGADA salvo los huecos.
export function capasDe(id: MedallaId, apagada = false): Capa[] {
  const capas = ICONOS[id].capas;
  return apagada ? capas.map((c) => ({ ...c, color: c.color === HUECO ? HUECO : APAGADA })) : capas;
}
