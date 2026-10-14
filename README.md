# Nos Vemos — landing y v1 de juntadas

- Landing retro gaming (Astro + React) en `/`: cuenta el problema, presenta la solución y guarda
  nombre y email en una tabla de Supabase que el público solo puede llenar, nunca leer.
- v1, por invitación (la landing no la enlaza): `/nueva` crea una juntada con varias fechas,
  `/j/<código>` es el link que se comparte. Cada uno entra con Google y marca cuándo puede; cuando
  una fecha llega al quórum la juntada se cierra sola y el organizador avisa por WhatsApp.

Specs: `specs/done/`. Los chequeos de cada criterio: `evals/run.sh`.

## Desarrollo local

```
npm ci
cp .env.example .env   # y completá los valores
npm run dev            # http://localhost:4321
npm test               # Vitest: lógica pura (leads, fechas, WhatsApp)
npm run test:db        # Vitest contra un Postgres embebido (sin Docker) con las migraciones
npm run build          # construye en .vercel/output
evals/run.sh           # todos los chequeos de las specs
```

Con `npm run dev`, la vista previa de diseño con datos de ejemplo está en
`/vista-previa/crear`, `/vista-previa/votar`, `/vista-previa/cerrada` y `/vista-previa/cancelada`.
Solo existe en desarrollo: el build de producción no la incluye.

## Supabase

1. Entrá a <https://supabase.com> y creá un proyecto nuevo (el plan gratuito alcanza).
2. En el proyecto: **SQL Editor → New query**, pegá el contenido de
   `supabase/migrations/001_leads.sql` y ejecutalo.
3. Verificá en **Table Editor** que existe `leads` con RLS activado ("RLS enabled") y en
   **Authentication → Policies** que hay una única política: `INSERT` para `anon`.
4. Copiá la **Project URL** y la **publishable key** (`sb_publishable_…`). Las ves en el diálogo
   **Connect** del proyecto o en **Settings → API Keys**. Es la sucesora de la clave `anon` (mismo
   rol `anon`, y es segura en el navegador porque RLS limita lo que puede hacer); las claves
   legacy `anon` y `service_role` dejan de existir a fines de 2026.
   Nunca uses ni pegues en este proyecto la **secret key** (`sb_secret_…`) ni la legacy
   `service_role`: las dos se saltean RLS.

Los leads se leen desde el panel de Supabase (**Table Editor**), con tu cuenta.

## Login con Google

La v1 pide entrar con Google. Se configura una vez, en Google Cloud y en Supabase. Necesitás la
URL de Vercel (`https://tu-proyecto.vercel.app`) y el *project ref* de Supabase (lo que va antes de
`.supabase.co` en la Project URL).

1. En <https://console.cloud.google.com> creá un proyecto (gratis), por ejemplo "Nos Vemos".
2. **APIs y servicios → Pantalla de consentimiento de OAuth** (o **Google Auth Platform →
   Branding**): tipo **Externo**, nombre "Nos Vemos", tu email de soporte. Los permisos que usa
   Supabase (email, perfil, openid) no requieren verificación de Google.
   - Mientras la app esté en modo **Testing**, solo pueden entrar los emails que cargues en
     **Test users** (hasta 100). Para el experimento alcanza: cargá los Gmail de los grupos de
     prueba. Si no querés cargarlos, pasala a **In production**.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo
   **Aplicación web**:
   - **Orígenes de JavaScript autorizados**: `https://tu-proyecto.vercel.app` y
     `http://localhost:4321`.
   - **URIs de redireccionamiento autorizados**: `https://<project-ref>.supabase.co/auth/v1/callback`
     (Google vuelve a Supabase, no a la app).
   - Copiá el **Client ID** y el **Client secret**.
4. En Supabase: **Authentication → Sign In / Providers → Google**: activalo y pegá el Client ID y
   el Client secret. Ese secret de Google vive solo ahí: nunca en el repo, en `.env` ni en Vercel.
5. En Supabase: **Authentication → URL Configuration**:
   - **Site URL**: `https://tu-proyecto.vercel.app`.
   - **Redirect URLs**: agregá `https://tu-proyecto.vercel.app/auth/callback` y
     `http://localhost:4321/auth/callback`.
6. Probá: abrí `https://tu-proyecto.vercel.app/nueva`, tocá **Entrar con Google** y volvés al
   formulario de nueva juntada.

## Migración 002

Crea las tablas de la v1 (`tipos_evento`, `perfiles`, `juntadas`, `opciones`, `participantes`,
`disponibilidad`, `movimientos`), sus funciones y la vista `metricas_experimento`. No toca `leads`.

1. Con la `001_leads.sql` ya corrida: **SQL Editor → New query**, pegá el contenido de
   `supabase/migrations/002_juntadas.sql` y ejecutalo una sola vez.
2. Verificá en **Table Editor** que las 7 tablas dicen "RLS enabled".
3. Verificá en **Database → Functions** que existen `asegurar_perfil`, `crear_juntada`,
   `juntada_publica`, `unirse`, `detalle_juntada`, `votar` y `cancelar`.
4. Verificá en **Authentication → Policies** que la única política nueva es la de lectura de
   `perfiles` ("cada uno lee su perfil"); las juntadas se leen y escriben solo por funciones.

No hacen falta variables nuevas: la v1 usa las mismas `PUBLIC_SUPABASE_URL` y
`PUBLIC_SUPABASE_ANON_KEY`.

## Métricas del experimento

La vista `metricas_experimento` no la puede leer el público ni los usuarios con sesión; la lee el
operador desde el panel. En **SQL Editor**:

```sql
select * from metricas_experimento order by creada_en desc;
```

| Columna | Qué es |
|---|---|
| `codigo`, `titulo`, `creada_en` | Para reconocer la juntada |
| `tamano_grupo` | Lo que cargó el organizador al crearla |
| `votantes` | Personas distintas que votaron al menos una vez (votar "no puedo" en todo también cuenta) |
| `tasa_voto` | `votantes / tamano_grupo`, redondeada a 2 decimales. La meta del experimento: ≥ 0.75 (6 de 8) |
| `estado` | `abierta`, `cerrada` o `cancelada` |
| `horas_hasta_cierre` | Horas desde que se creó hasta que llegó al quórum; vacío si no se cerró |

## Variables de entorno

| Variable | Qué es |
|---|---|
| `PUBLIC_SUPABASE_URL` | Project URL del paso anterior |
| `PUBLIC_SUPABASE_ANON_KEY` | La publishable key `sb_publishable_…` (el nombre de la variable no cambia; segura porque la tabla solo deja insertar) |
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
- [ ] v1: la migración `002_juntadas.sql` está corrida y las 7 tablas muestran RLS activado.
- [ ] v1: el login con Google está configurado (sección de arriba) y probaste entrar en `/nueva` desde el celular.
- [ ] v1: creaste una juntada de prueba, la votaste desde dos cuentas, llegó al quórum y el botón "Avisar al grupo por WhatsApp" abrió WhatsApp con el texto.
- [ ] v1: borraste las juntadas de prueba (en **Table Editor**, borrar la fila de `juntadas` borra sus opciones, participantes, votos y movimientos).

## Licencias

- Fuente Press Start 2P: SIL Open Font License 1.1 (`public/fonts/OFL-PressStart2P.txt`).
- Sprites: packs Tiny Dungeon y Tiny Town de Kenney, CC0 (`public/sprites/`, con el archivo de licencia de cada pack).
