// Cliente de Supabase para el servidor (SSR): la sesión viaja en cookies, con `@supabase/ssr`.
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function supabaseServidor(request: Request, cookies: AstroCookies) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY');
  return createServerClient(url, key, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({ name, value: value ?? '' })),
      setAll: (lista) => {
        for (const { name, value, options } of lista) cookies.set(name, value, options);
      },
    },
  });
}

// Solo rutas internas: evita usar `next` para redirigir a otro sitio.
export function rutaSegura(next: string | null | undefined, porDefecto = '/nueva'): string {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : porDefecto;
}
