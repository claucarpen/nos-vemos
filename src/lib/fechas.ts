// Fechas de la juntada: se guardan en UTC y se muestran siempre en hora de Argentina, formato es-AR.

export const ZONA = 'America/Argentina/Buenos_Aires';

const partes = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA, weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const local = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function trozos(fmt: Intl.DateTimeFormat, d: Date) {
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(d)) p[type] = value;
  return p;
}

// "jueves 23/10, 21:00 h"
export function formatearInicio(inicio: string | Date): string {
  const p = trozos(partes, new Date(inicio));
  return `${p.weekday} ${p.day}/${p.month}, ${p.hour}:${p.minute} h`;
}

// Fecha y hora de Argentina como las da un <input type="datetime-local">: "2026-10-23T21:00".
export function aLocalArgentina(d: Date): string {
  const p = trozos(local, d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Interpreta "AAAA-MM-DDTHH:MM" como hora de Argentina y devuelve el instante en ISO (UTC).
// El offset sale de la base de zonas de Intl, no de un -03:00 fijo. Devuelve null si no es válida.
export function desdeLocalArgentina(valor: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const comoUtc = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(comoUtc)) return null;
  // offset = (lo que muestra Argentina para ese instante) - (el instante); se corrige dos veces por si cruza un cambio de hora.
  let t = comoUtc;
  for (let i = 0; i < 2; i++) {
    const visto = Date.parse(`${aLocalArgentina(new Date(t))}:00Z`);
    t = comoUtc - (visto - t);
  }
  if (aLocalArgentina(new Date(t)) !== valor.trim()) return null; // p. ej. 31/02 o una hora que no existe
  return new Date(t).toISOString();
}
