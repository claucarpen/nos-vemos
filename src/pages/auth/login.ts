// POST desde "Entrar con Google": arranca el OAuth de Supabase (PKCE; el verificador queda en cookie).
import type { APIRoute } from 'astro';
import { rutaSegura, supabaseServidor } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url, redirect }) => {
  const form = await request.formData();
  const next = rutaSegura(String(form.get('next') ?? ''));
  const supabase = supabaseServidor(request, cookies);
  const callback = new URL('/auth/callback', url.origin);
  callback.searchParams.set('next', next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.href },
  });
  if (error || !data.url) return redirect(`${next}?login=error`, 303);
  return redirect(data.url, 303);
};
