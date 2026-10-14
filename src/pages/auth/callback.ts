// Vuelta de Google: canjea el código por la sesión (cookies), asegura el perfil y sigue a `next`.
import type { APIRoute } from 'astro';
import { rutaSegura, supabaseServidor } from '../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const next = rutaSegura(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  if (!code) return redirect(`${next}?login=error`, 303);
  const supabase = supabaseServidor(request, cookies);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect(`${next}?login=error`, 303);
  await supabase.rpc('asegurar_perfil');
  return redirect(next, 303);
};
