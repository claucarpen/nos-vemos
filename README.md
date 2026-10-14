# Nos Vemos — landing con captura de leads

Landing retro gaming (Astro + React) que cuenta el problema, presenta la solución y guarda
nombre y email en una tabla de Supabase que el público solo puede llenar, nunca leer.

Spec: `specs/001-landing-leads.md`. Los chequeos de cada criterio: `evals/run.sh`.

## Desarrollo local

```
npm ci
cp .env.example .env   # y completá los valores
npm run dev            # http://localhost:4321
npm test               # Vitest: lógica de saveLead con un cliente de Supabase falso
npm run build          # construye en .vercel/output
evals/run.sh           # todos los chequeos de las specs
```

## Supabase

1. Entrá a <https://supabase.com> y creá un proyecto nuevo (el plan gratuito alcanza).
2. En el proyecto: **SQL Editor → New query**, pegá el contenido de
   `supabase/migrations/001_leads.sql` y ejecutalo.
3. Verificá en **Table Editor** que existe `leads` con RLS activado ("RLS enabled") y en
   **Authentication → Policies** que hay una única política: `INSERT` para `anon`.
4. En **Project Settings → API** copiá la **Project URL** y la clave **anon public**.
   Nunca uses ni pegues la clave `service_role` en este proyecto.

Los leads se leen desde el panel de Supabase (**Table Editor**), con tu cuenta.

## Variables de entorno

| Variable | Qué es |
|---|---|
| `PUBLIC_SUPABASE_URL` | Project URL del paso anterior |
| `PUBLIC_SUPABASE_ANON_KEY` | Clave `anon public` (segura porque la tabla solo deja insertar) |
| `PUBLIC_CONTACT_EMAIL` | Email al que escriben quienes piden borrar sus datos; aparece en el aviso de privacidad |

Local: van en `.env` (está en `.gitignore`; no lo subas). En producción: en Vercel, ver abajo.
Las variables se leen al construir: si las cambiás en Vercel, hay que volver a desplegar.

## Deploy en Vercel

1. Subí el repo a GitHub.
2. En <https://vercel.com> elegí **Add New → Project** e importá el repo. Vercel detecta Astro solo.
3. En **Environment Variables** cargá las tres variables de arriba (Production y Preview).
4. **Deploy**. La landing queda en la dirección gratuita `*.vercel.app`.
5. Para medir canales, compartí links con `?utm_source=` al final, por ejemplo
   `https://tu-proyecto.vercel.app/?utm_source=whatsapp`. Ese valor se guarda en `fuente`
   (minúsculas, solo `a-z`, `0-9`, `_` y `-`, hasta 50 caracteres; si no, `directo`).

## Checklist antes de publicar

- [ ] La migración `001_leads.sql` está corrida y `leads` muestra RLS activado.
- [ ] Hay una sola política en `leads` (insert para `anon`) y ninguna de lectura.
- [ ] Las tres variables están cargadas en Vercel y el último deploy es posterior a cargarlas.
- [ ] Existe un email de contacto real y está en `PUBLIC_CONTACT_EMAIL`; el aviso de privacidad lo muestra.
- [ ] Probaste el formulario en el sitio desplegado con un email tuyo: aparece "¡PLAYER JOINED!" y la fila en Table Editor.
- [ ] Mandaste el mismo email dos veces: la segunda dice "¡Ya estabas en la lista!".
- [ ] Probaste desde un link con `?utm_source=prueba` y `fuente` quedó en `prueba`.
- [ ] Borraste de la tabla tus filas de prueba.
- [ ] Abriste la página en el celular y se ve bien.
- [ ] Revisaste que el aviso de privacidad cumple lo que exige tu país para guardar datos personales.

## Licencias

- Fuente Press Start 2P: SIL Open Font License 1.1 (`public/fonts/OFL-PressStart2P.txt`).
- Sprites: packs Tiny Dungeon y Tiny Town de Kenney, CC0 (`public/sprites/`, con el archivo de licencia de cada pack).
