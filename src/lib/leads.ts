// Lógica pura de `saveLead`: sin Astro ni Supabase real, para testearla con un cliente falso.

export const MESSAGES = {
  ok: '¡PLAYER JOINED! Te avisamos cuando arranque.',
  duplicate: '¡Ya estabas en la lista!',
  invalid: 'Revisá tu nombre y tu email e intentá de nuevo.',
  error: 'GAME OVER… algo falló. Probá de nuevo.',
} as const;

export type LeadStatus = 'ok' | 'duplicate' | 'invalid' | 'error';
export type LeadResult = { status: LeadStatus; message: string };

export type LeadRow = { nombre: string; email: string; fuente: string };

// El mínimo del cliente de Supabase que usamos: `from(tabla).insert(fila)`.
// Sin `.select()` a propósito: el rol `anon` no tiene permiso de lectura.
export interface LeadsClient {
  from(table: 'leads'): {
    insert(row: LeadRow): PromiseLike<{ error: { code?: string; message?: string } | null }>;
  };
}

export type RawLead = {
  nombre?: unknown;
  email?: unknown;
  honeypot?: unknown;
  utm_source?: unknown;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FUENTE_RE = /^[a-z0-9_-]{1,50}$/;

export function sanitizeFuente(raw: unknown): string {
  if (typeof raw !== 'string') return 'directo';
  const value = raw.trim().toLowerCase();
  return FUENTE_RE.test(value) ? value : 'directo';
}

export function normalizeNombre(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value.length >= 1 && value.length <= 80 ? value : null;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return value.length <= 254 && EMAIL_RE.test(value) ? value : null;
}

const result = (status: LeadStatus): LeadResult => ({ status, message: MESSAGES[status] });

export async function processLead(raw: RawLead, client: LeadsClient): Promise<LeadResult> {
  // Honeypot: un humano no lo ve. Si trae valor, parece éxito y no se guarda nada.
  if (typeof raw.honeypot === 'string' && raw.honeypot !== '') return result('ok');

  const nombre = normalizeNombre(raw.nombre);
  const email = normalizeEmail(raw.email);
  if (nombre === null || email === null) return result('invalid');

  const fuente = sanitizeFuente(raw.utm_source);

  try {
    const { error } = await client.from('leads').insert({ nombre, email, fuente });
    if (!error) return result('ok');
    if (error.code === '23505') return result('duplicate');
    return result('error');
  } catch {
    return result('error');
  }
}
