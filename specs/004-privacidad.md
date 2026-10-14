---
status: pendiente
depends_on: [001, 003]
---

# 004 — Página de política de privacidad `/privacidad`

Agregar una página pública que explique, en lenguaje simple, qué datos guarda Nos Vemos, para qué,
dónde y cómo pedir que se borren. Google la exige para publicar el login (hoy la app está en modo
Prueba y cada participante tiene que estar cargado a mano como usuario de prueba).

**Tipo**: feature · **Flujo**: requirements-first

## Estado previo

Ver `ARCHITECTURE.md`. La landing (`src/pages/index.astro`) tiene un aviso corto de privacidad
sobre los leads y un `<footer>`. La v1 muestra "Entrar con Google" desde
`src/components/app/EntrarConGoogle.astro` (en `/nueva`) y "Entrá con Google para votar" desde
`src/components/app/JuntadaPublica.astro` (en `/j/<código>`). El email de contacto sale de
`PUBLIC_CONTACT_EMAIL`. No existe ninguna página de privacidad.

## Qué se construye

1. **`src/pages/privacidad.astro`**, prerenderizada, con la misma paleta, tipografías y favicon que
   la landing, título "Política de privacidad — Nos Vemos". Secciones (en este orden, cada una
   con su `id`):
   - `#responsable` — **Quién está a cargo**: Claudio Carpentino, responsable de Nos Vemos.
     Contacto: el email de `PUBLIC_CONTACT_EMAIL`.
   - `#datos` — **Qué datos guardamos**:
     - Si te anotás en la lista: nombre, email y de qué link llegaste (`fuente`).
     - Si entrás con Google: nombre, email y foto de perfil que Google comparte al iniciar sesión.
       La foto queda en el registro de inicio de sesión; Nos Vemos no la muestra.
     - Si usás una juntada: las juntadas que creás, las fechas en las que marcás que podés y un
       historial de participación (te uniste, votaste, quedaste confirmado).
   - `#uso` — **Para qué los usamos**: avisarte cuando Nos Vemos esté listo; que funcionen las
     juntadas (mostrar tu nombre a tu grupo, contar votos, cerrar por quórum); medir cómo se usa el
     producto con números agregados, por ejemplo cuántos votan en cada juntada.
   - `#no-hacemos` — **Lo que no hacemos**: no vendemos ni compartimos tus datos con nadie; las
     demás personas de una juntada ven tu nombre y tus votos, **nunca tu email**; no te mandamos
     publicidad.
   - `#donde` — **Dónde se guardan**: en Supabase (base de datos); el sitio corre en Vercel. El
     inicio de sesión lo hace Google.
   - `#plazo` — **Cuánto tiempo**: hasta que pidas borrarlos, o hasta que Nos Vemos deje de
     funcionar, lo que pase primero.
   - `#derechos` — **Tus derechos**: podés pedir ver, corregir o borrar tus datos escribiendo al
     email de contacto (link `mailto:`).
   - `#actualizacion` — **Última actualización**: la fecha de publicación, en formato
     "14 de octubre de 2026".
   - Al final, un link "Volver a Nos Vemos" a `/`.
2. **Enlaces a `/privacidad`**:
   - en el aviso de privacidad del formulario de la landing ("Más detalles en nuestra política de
     privacidad");
   - en el `<footer>` de la landing ("Privacidad");
   - debajo del botón de `EntrarConGoogle.astro` y en `JuntadaPublica.astro`: "Al entrar aceptás
     nuestra política de privacidad".
3. `README.md`: sección **Publicar el login de Google**: en Google Auth Platform → Información de
   la marca, página principal `https://nos-vemos-five.vercel.app`, política de privacidad
   `https://nos-vemos-five.vercel.app/privacidad`, dominio autorizado `nos-vemos-five.vercel.app`,
   **sin logo** (dispara la verificación de Google); después Público → Publicar app.

## Criterios de aceptación y sus evals

Se agregan a `evals/run.sh`. Todos los evals de las specs 001, 002 y 003 siguen pasando.

| # | Criterio | Eval |
|---|---|---|
| C1 | Compila, se prerenderiza y no rompe nada | `npm ci && npm run build` sale con código 0; existe el HTML estático de `/privacidad` en `.vercel/output/static/`; `evals/run.sh` completo: 0 fallan |
| C2 | Tiene todas las secciones | En el HTML construido de `/privacidad` existen los 8 `id`: `responsable`, `datos`, `uso`, `no-hacemos`, `donde`, `plazo`, `derechos`, `actualizacion`; aparecen los textos "Claudio Carpentino", "foto de perfil", "nunca tu email", "Supabase", "Vercel" y "Google" |
| C3 | El contacto sale de la variable | Construyendo con `PUBLIC_CONTACT_EMAIL=contacto-eval@ejemplo.test`, el HTML de `/privacidad` contiene `mailto:contacto-eval@ejemplo.test`; `grep` en `src/pages/privacidad.astro`: ningún email escrito a mano |
| C4 | Está enlazada donde corresponde | En el HTML construido de `/`: dos `href="/privacidad"` (aviso y footer); `grep` en `EntrarConGoogle.astro` y `JuntadaPublica.astro`: `href="/privacidad"` en cada uno |
| C5 | Se ve bien en celular y carga limpia | Playwright: `/privacidad` a 375 px sin scroll horizontal; carga sin 404 ni errores de consola |
| C6 | El README explica cómo publicar el login | `README.md` tiene la sección "Publicar el login de Google" con las tres URLs y la advertencia de no subir logo |
| C7 | El texto se entiende y es honesto | Rúbrica: (1) español rioplatense y oraciones cortas, sin jerga legal; (2) no promete nada que el producto no haga ni cita leyes; (3) cada dato listado coincide con lo que guardan las tablas (`leads`, `perfiles`, `juntadas`, `opciones`, `disponibilidad`, `movimientos`) y el login; (4) misma estética que la landing, legible. Evaluada sobre capturas a 375 y 1280 px adjuntas al PR |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-14): responsable "Claudio Carpentino"; plazo "hasta que pidas
  borrarlos o hasta que Nos Vemos deje de funcionar"; se declara la foto de perfil de Google;
  derechos de ver, corregir y borrar por email, sin citar leyes; enlaces en el aviso, el footer y
  las pantallas de login.

### Delegadas al agente, con criterio

- **Diseño de la página**: el más simple que reutilice estilos existentes (`global.css`/`app.css`)
  y pase la rúbrica; sin el header ilustrado de la landing.
- **Texto exacto** de cada sección: a partir del contenido de arriba, sin agregar datos ni usos.

### Condiciones de parada

- Si al revisar las tablas o el login aparece un dato guardado que no está en la lista de arriba.
- Si algo exige tocar la base, las funciones o la lógica de la v1.
- Contradicción entre criterios o una decisión que ninguna lista cubre.

## Efectos que escapan del sistema

**Ninguno durante la implementación.** Completar la marca en Google y publicar la app son actos del
operador, siguiendo el README, después de que `/privacidad` esté en línea.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Términos y condiciones | Google o un usuario los pide, o el producto empieza a cobrar |
| Banner de cookies | Se agrega analítica o cookies que no sean de sesión |
| Borrado de cuenta desde la app | Llega el primer pedido de borrado y hacerlo a mano no alcanza |
| Versión en inglés | Aparece un usuario que no habla español |
