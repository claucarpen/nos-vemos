# Astro 7 + Vercel: lo que no se deduce del código

- El build sale en `.vercel/output/static/`, no en `dist/`; los evals y el servidor estático leen de ahí.
- El HTML construido normaliza atributos (`required=""`, orden de `name`); los evals con grep no deben asumir el orden.
- Insertar en Supabase sin `.select()`: el rol `anon` no tiene política de lectura y un `insert().select()` falla.
- `.gitignore` con `.env.*` ignora también `.env.example`: hace falta `!.env.example`.
- El texto JSX en líneas separadas pierde el espacio entre una frase y una expresión: usar `{' '}`.
- Las variables `PUBLIC_*` se leen al construir: cambiarlas en Vercel exige volver a desplegar.
- `astro dev` pasa solo a segundo plano si detecta que lo corre un agente: para un servidor en primer plano (Playwright, capturas) usar `--ignore-lock`; uno en segundo plano se corta con `npx astro dev stop`.
- `@astrojs/vercel` no tiene `astro preview`: las páginas renderizadas en servidor se prueban con `astro dev`.
- Una ruta inyectada con `injectRoute` solo cuando `command === 'dev'` no llega al build.
- `@supabase/ssr` funciona con Astro 7 leyendo cookies con `parseCookieHeader(request.headers.get('Cookie'))` y escribiéndolas con `Astro.cookies.set`; probado el ida y vuelta login → callback → página con sesión contra un Supabase falso.
