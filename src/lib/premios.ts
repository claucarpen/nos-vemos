// Fuente única de los puntos, las ventanas y las medallas (spec 010). `003_premios.sql` repite
// estos valores en `premios_valor()`; `tests/db/premios.test.ts` (010·C13) verifica que coincidan.
// Ninguna página escribe un número de puntos a mano: todas leen de acá.

export type ReglaId =
  | 'votar' | 'voto_rapido' | 'confirmado' | 'organizar'
  | 'voto_tardio' | 'te_colgaste' | 'cambio_ultimo_momento' | 'cancelar';

export type Regla = { id: ReglaId; nombre: string; puntos: number; cuando: string; tope: string };

export const VENTANAS = {
  horas_rapido: 24,
  horas_tardio: 72,
  horas_unido: 12,
  horas_ultimo_momento: 2,
  tope_cambios: 3,
} as const;

const V = VENTANAS;

export const SUMAN: Regla[] = [
  { id: 'votar', nombre: 'Votar', puntos: 10, cuando: 'Tu primer voto en la juntada.', tope: '1 por juntada' },
  { id: 'voto_rapido', nombre: 'Voto rápido', puntos: 5, cuando: `Tu primer voto llega en menos de ${V.horas_rapido} h desde que se creó la juntada.`, tope: '1 por juntada' },
  { id: 'confirmado', nombre: 'Confirmado', puntos: 20, cuando: 'La juntada se cierra y podés en la fecha ganadora.', tope: '1 por juntada' },
  { id: 'organizar', nombre: 'Organizar con éxito', puntos: 30, cuando: 'Organizaste la juntada y se cerró.', tope: '1 por juntada' },
];

export const RESTAN: Regla[] = [
  { id: 'voto_tardio', nombre: 'Voto tardío', puntos: -5, cuando: `Tu primer voto llega ${V.horas_tardio} h o más después de que se creó la juntada.`, tope: '1 por juntada' },
  { id: 'te_colgaste', nombre: 'Te colgaste', puntos: -15, cuando: `La juntada se cerró y nunca votaste (si te habías unido al menos ${V.horas_unido} h antes del cierre).`, tope: '1 por juntada' },
  { id: 'cambio_ultimo_momento', nombre: 'Cambio de último momento', puntos: -3, cuando: `Cada vez que cambiás tu voto en las últimas ${V.horas_ultimo_momento} h antes del cierre.`, tope: `${V.tope_cambios} por juntada` },
  { id: 'cancelar', nombre: 'Cancelar', puntos: -15, cuando: 'Organizaste la juntada y la cancelaste.', tope: '1 por juntada' },
];

export const REGLAS: Regla[] = [...SUMAN, ...RESTAN];

export function regla(id: string): Regla | undefined {
  return REGLAS.find((r) => r.id === id);
}

export function puntosDe(id: ReglaId): number {
  return regla(id)!.puntos;
}

export type MedallaId = 'primer_voto' | 'rayo' | 'destrabador' | 'infaltable' | 'anfitrion' | 'fantasma' | 'redencion';

// `umbral`: cuántas veces hay que cumplir la condición (null si alcanza con una vez).
// `verguenza`: se muestra distinta de las demás.
export type Medalla = { id: MedallaId; nombre: string; condicion: string; umbral: number | null; verguenza: boolean };

export const MEDALLAS: Medalla[] = [
  { id: 'primer_voto', nombre: 'Player 1', condicion: 'Votá por primera vez en una juntada que no se cancele.', umbral: null, verguenza: false },
  { id: 'rayo', nombre: 'Rayo', condicion: 'Votá rápido en 3 juntadas.', umbral: 3, verguenza: false },
  { id: 'destrabador', nombre: 'Llave final', condicion: 'Que tu voto sea el que cierra una juntada.', umbral: null, verguenza: false },
  { id: 'infaltable', nombre: 'Infaltable', condicion: 'Quedá confirmado en 5 juntadas.', umbral: 5, verguenza: false },
  { id: 'anfitrion', nombre: 'Anfitrión', condicion: 'Organizá 3 juntadas que se cierren.', umbral: 3, verguenza: false },
  { id: 'fantasma', nombre: 'Fantasma', condicion: 'Colgate en 3 juntadas. Es la medalla de la vergüenza.', umbral: 3, verguenza: true },
  { id: 'redencion', nombre: 'Redención', condicion: 'Votá en la juntada que sigue a una en la que te colgaste.', umbral: null, verguenza: false },
];

export function medalla(id: string): Medalla | undefined {
  return MEDALLAS.find((m) => m.id === id);
}

// "+10", "-15", "0": siempre con signo. Guion ASCII: Press Start 2P no tiene el signo menos (U+2212).
export function conSigno(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

// Ventana en la que cae un primer voto hecho ahora, para el aviso de lo que está en juego.
export type Ventana = { efecto: number; hasta: Date | null };

export function ventanaActual(creadaEn: Date, ahora: Date = new Date()): Ventana {
  const horas = (ahora.getTime() - creadaEn.getTime()) / 3_600_000;
  const h = (n: number) => new Date(creadaEn.getTime() + n * 3_600_000);
  if (horas < V.horas_rapido) return { efecto: puntosDe('voto_rapido'), hasta: h(V.horas_rapido) };
  if (horas < V.horas_tardio) return { efecto: 0, hasta: h(V.horas_tardio) };
  return { efecto: puntosDe('voto_tardio'), hasta: null };
}

// "5 h", "45 min": lo que falta para el fin de una ventana.
export function faltaTexto(hasta: Date, ahora: Date = new Date()): string {
  const min = Math.max(0, Math.round((hasta.getTime() - ahora.getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h`;
}

// Formas de lo que devuelven `ranking_juntada` y `mis_premios`.
export type FilaRanking = { nombre: string; puntos: number; medallas: number; soy_yo: boolean };
export type MedallaGanada = { medalla: MedallaId; nombre: string };
export type Penalidad = { nombre: string; regla: ReglaId; puntos: number };
export type Ranking = {
  creada_en: string;
  ranking: FilaRanking[];
  medallas: MedallaGanada[];
  penalidades: Penalidad[];
};

export type MiMedalla = { medalla: MedallaId; fecha: string; codigo: string; titulo: string };
export type Movida = { regla: ReglaId; puntos: number };
export type Partida = { codigo: string; titulo: string; estado: 'abierta' | 'cerrada' | 'cancelada'; puntos: number; detalle: Movida[] };
export type MisPremios = { puntos: number; medallas: MiMedalla[]; historial: Partida[] };
