#!/usr/bin/env bash
# Los evals del repo — un chequeo por criterio de aceptación de cada spec. Se corre: `evals/run.sh`
set -u

passed=0
failed=0
ok() { printf 'PASS %s\n' "$1"; passed=$((passed + 1)); }
ko() { printf 'FAIL %s\n' "$1"; failed=$((failed + 1)); }
ev() { printf '     | %s\n' "$1"; }

# Cada spec suma acá sus chequeos, una función por criterio, y los llama abajo.

# --- Spec 001: landing con captura de leads -------------------------------------------------

BUILT=.vercel/output/static/index.html
SENTINEL_EMAIL=contacto-eval@ejemplo.test

# Un <input ...> del HTML construido que contenga todos los patrones dados.
input_has() { grep -oE '<input[^>]*>' "$BUILT" | grep -E "$1" | grep -qE "$2"; }

c1_build() {
  local out
  if out=$(npm ci 2>&1 && PUBLIC_CONTACT_EMAIL="$SENTINEL_EMAIL" npm run build 2>&1); then
    ok "C1 el proyecto compila"
  else
    ko "C1 el proyecto compila"; ev "$(printf '%s' "$out" | tail -5)"
  fi
}

c2_sections() {
  local miss=""
  for id in problema solucion form-leads; do grep -q "id=\"$id\"" "$BUILT" 2>/dev/null || miss="$miss $id"; done
  if [ -z "$miss" ]; then ok "C2 las tres secciones y el formulario existen"; else ko "C2 faltan ids:$miss"; fi
}

c3_fields() {
  local miss=""
  input_has 'name="nombre"' ' required' || miss="$miss nombre-required"
  input_has 'type="email"' 'name="email"' || miss="$miss email-tipo"
  input_has 'type="email"' ' required' || miss="$miss email-required"
  input_has 'aria-hidden="true"' 'tabindex="-1"' || miss="$miss honeypot"
  if [ -z "$miss" ]; then ok "C3 campos del formulario"; else ko "C3 campos:$miss"; fi
}

c4_tests() {
  local out
  if out=$(npm test 2>&1); then ok "C4 validación, honeypot, fuente y duplicados (Vitest)"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "C4 Vitest"; ev "$(printf '%s' "$out" | tail -8)"; fi
}

c5_migration() {
  local f=supabase/migrations/001_leads.sql miss=""
  [ -f "$f" ] || { ko "C5 falta $f"; return; }
  local flat; flat=$(tr '\n' ' ' < "$f" | tr -s ' ' | tr 'A-Z' 'a-z')
  for pat in 'id uuid primary key default gen_random_uuid\(\)' 'nombre text not null' 'email text not null unique' \
             "fuente text not null default 'directo'" 'creado_en timestamptz not null default now\(\)' \
             'enable row level security'; do
    printf '%s' "$flat" | grep -qE "$pat" || miss="$miss [$pat]"
  done
  [ "$(grep -ci 'create policy' "$f")" = "1" ] || miss="$miss [policies!=1]"
  printf '%s' "$flat" | grep -qE 'create policy[^;]*for insert[^;]*to anon' || miss="$miss [insert-to-anon]"
  ! grep -qiE 'for (select|update|delete|all)' "$f" || miss="$miss [policy-no-insert]"
  if [ -z "$miss" ]; then ok "C5 migración: forma y seguridad"; else ko "C5 migración:$miss"; fi
}

c6_secrets() {
  local miss=""
  ! git ls-files | grep -qE '(^|/)\.env$' || miss="$miss .env-versionado"
  grep -qxF '.env' .gitignore || miss="$miss .gitignore"
  # Código fuente: no incluye specs ni docs, que nombran la clave para prohibirla.
  ! grep -rqi 'service_role' src scripts tests supabase astro.config.mjs package.json || miss="$miss service_role"
  for v in PUBLIC_SUPABASE_URL PUBLIC_SUPABASE_ANON_KEY PUBLIC_CONTACT_EMAIL; do
    grep -qE "^$v=$" .env.example || miss="$miss $v-con-valor-o-ausente"
  done
  if [ -z "$miss" ]; then ok "C6 sin secretos en el repo"; else ko "C6:$miss"; fi
}

c7_sprites() {
  local n lic bad=""
  n=$(find public/sprites -maxdepth 1 -name '*.png' 2>/dev/null | wc -l | tr -d ' ')
  lic=$(find public/sprites -maxdepth 1 -iname '*license*' 2>/dev/null)
  [ -n "$lic" ] || bad=" sin-licencia"
  for f in $lic; do grep -q 'CC0' "$f" || bad="$bad $f"; done
  if [ "$n" -ge 1 ] && [ -z "$bad" ]; then ok "C7 sprites con licencia CC0 ($n sprites, $(printf '%s' "$lic" | wc -w) licencias)"
  else ko "C7 sprites con licencia (sprites: $n;$bad)"; fi
}

c8_mobile() {
  local out
  if out=$(npx playwright test tests/e2e/mobile.spec.ts 2>&1); then ok "C8 375px sin scroll horizontal y botón visible"
  else ko "C8 Playwright"; ev "$(printf '%s' "$out" | tail -8)"; fi
}

c9_privacy() {
  local miss=""
  grep -q 'No los compartimos ni los vendemos' "$BUILT" 2>/dev/null && grep -q "$SENTINEL_EMAIL" "$BUILT" 2>/dev/null || miss="$miss texto-o-email-en-build"
  grep -q 'PUBLIC_CONTACT_EMAIL' src/pages/index.astro || miss="$miss variable-en-fuente"
  # Ningún email escrito a mano en el fuente.
  ! grep -rEq --exclude='*.test.ts' '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' src || miss="$miss email-hardcodeado"
  if [ -z "$miss" ]; then ok "C9 aviso de privacidad con PUBLIC_CONTACT_EMAIL"; else ko "C9:$miss"; fi
}

c11_readme() {
  local miss=""
  for h in 'Supabase' 'Variables de entorno' 'Deploy en Vercel' 'Checklist antes de publicar'; do
    grep -qE "^#{1,3} $h" README.md 2>/dev/null || miss="$miss [$h]"
  done
  if [ -z "$miss" ]; then ok "C11 README con las cuatro secciones"; else ko "C11 faltan:$miss"; fi
}

# C10 es una rúbrica evaluada sobre capturas a 375 y 1280 px adjuntas al PR; no corre acá.
# Evidencia de C10: specs/done/001-landing-leads.md.

# --- Spec 002: residuales de la landing -----------------------------------------------------

c12_favicon() {
  local miss="" out
  local d=.vercel/output/static
  [ -f $d/favicon.png ] || miss="$miss favicon.png"
  [ -f $d/favicon.ico ] || miss="$miss favicon.ico"
  file $d/favicon.ico 2>/dev/null | grep -q 'MS Windows icon resource' || miss="$miss ico-no-es-icono"
  grep -oE '<link[^>]*rel="icon"[^>]*>' "$BUILT" 2>/dev/null | grep -q 'href="/favicon.png"' || miss="$miss link-icon"
  if ! out=$(npx playwright test tests/e2e/favicon.spec.ts -g C12 2>&1); then miss="$miss playwright"; fi
  if [ -z "$miss" ]; then ok "C12 favicon: mascota x2, ico y <link rel=icon>"; else ko "C12 favicon:$miss"; ev "$(printf '%s' "${out:-}" | tail -8)"; fi
}

c13_no_errors() {
  local out
  if out=$(npx playwright test tests/e2e/favicon.spec.ts -g C13 2>&1); then ok "C13 la página carga sin 404 ni errores de consola"
  else ko "C13 Playwright"; ev "$(printf '%s' "$out" | tail -8)"; fi
}

c14_hero_clipping() {
  local out
  if out=$(npx playwright test tests/e2e/hero-clipping.spec.ts -g C14 2>&1); then ok "C14 ningún sprite del header cortado de 320 a 1920 px"
  else ko "C14 Playwright"; ev "$(printf '%s' "$out" | head -30)"; fi
}

c15_hero_scenery() {
  local out
  if out=$(npx playwright test tests/e2e/hero-clipping.spec.ts -g C15 2>&1); then ok "C15 31 sprites enteros a 1920 px; mascota, cofre y poción siempre"
  else ko "C15 Playwright"; ev "$(printf '%s' "$out" | head -30)"; fi
}

c16_readme_keys() {
  local miss="" row
  for t in 'sb_publishable_' 'sb_secret_' 'service_role' 'API Keys'; do grep -qF "$t" README.md || miss="$miss [$t]"; done
  row=$(grep -F 'PUBLIC_SUPABASE_ANON_KEY' README.md | grep '^|')
  printf '%s' "$row" | grep -qF 'sb_publishable_' || miss="$miss [fila-sin-publishable]"
  ! grep -qF 'anon public' README.md || miss="$miss [anon-public]"
  if [ -z "$miss" ]; then ok "C16 README pide la publishable key y prohíbe la secret"; else ko "C16 README:$miss"; fi
}

# --- Spec 003: v1 — crear juntada, votar y cierre por quórum ---------------------------------

MIG2=supabase/migrations/002_juntadas.sql
TABLAS3="tipos_evento perfiles juntadas opciones participantes disponibilidad movimientos"
FUNCS3="asegurar_perfil crear_juntada juntada_publica unirse detalle_juntada votar cancelar"

# Sentencias SQL de la migración, una por línea, en minúsculas y sin comentarios.
sql_statements() { sed 's/--.*$//' "$1" | tr '\n' ' ' | tr -s ' ' | tr 'A-Z' 'a-z' | sed 's/;/;\n/g'; }

s3_c0_paso0() {
  local out
  if out=$(npx vitest run --config vitest.db.config.ts tests/db/shim.test.ts 2>&1); then ok "003·C0 Postgres embebido con shim de Supabase (paso 0)"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "003·C0 paso 0"; ev "$(printf '%s' "$out" | tail -12)"; fi
}

s3_c1_build() {
  local miss="" cfg=.vercel/output/config.json
  [ -f "$BUILT" ] || miss="$miss landing-no-prerenderizada"
  for r in '\^/nueva' '\^/j/' '\^/auth/callback' '\^/auth/login'; do grep -q "\"src\": \"$r" "$cfg" 2>/dev/null || miss="$miss ruta[$r]"; done
  # Modificado por la spec 005·C4: el único enlace de la landing a la v1 es href="/nueva"; ninguno a /j/.
  ! grep -q 'href="/j/' "$BUILT" 2>/dev/null || miss="$miss landing-enlaza-a-/j/"
  [ "$(grep -oE 'href="/(nueva|j/)[^"]*"' "$BUILT" 2>/dev/null | sort -u)" = 'href="/nueva"' ] || miss="$miss enlace-a-la-v1-distinto-de-/nueva"
  if [ -z "$miss" ]; then ok "003·C1 compila con las rutas de la v1; la landing sigue prerenderizada y su único enlace a la v1 es /nueva"; else ko "003·C1:$miss"; fi
}

s3_c2_migration() {
  local miss="" st t f
  [ -f "$MIG2" ] || { ko "003·C2 falta $MIG2"; return; }
  st=$(sql_statements "$MIG2")
  for t in $TABLAS3; do
    printf '%s\n' "$st" | grep -qE "^ ?create table public\.$t \(" || miss="$miss tabla[$t]"
    printf '%s\n' "$st" | grep -qE "^ ?alter table public\.$t enable row level security;" || miss="$miss rls[$t]"
  done
  for f in $FUNCS3; do
    printf '%s\n' "$st" | awk -v f="create function public.$f(" 'index($0, f) { found=1; if (index($0, "security definer") && index($0, "set search_path")) good=1 } END { exit !(found && good) }' \
      || miss="$miss funcion[$f]"
  done
  ! printf '%s\n' "$st" | grep -E '^ ?create policy' | grep -qE 'for (insert|update|delete|all) .*to authenticated' || miss="$miss politica-de-escritura"
  ! printf '%s\n' "$st" | grep -E '^ ?(alter|drop|create policy)' | grep -qE '(public\.)?leads\b' || miss="$miss toca-leads"
  if [ -z "$miss" ]; then ok "003·C2 migración: 7 tablas con RLS, 7 funciones security definer con search_path, sin escritura directa, leads intacta"
  else ko "003·C2 migración:$miss"; fi
}

s3_c3_db() {
  local out
  if out=$(npm run test:db 2>&1); then ok "003·C3 reglas y seguridad en la base (npm run test:db)"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "003·C3 npm run test:db"; ev "$(printf '%s' "$out" | grep -E '✗|×|FAIL|Tests |Error' | head -15)"; fi
}

s3_c4_unit() {
  local out
  if out=$(npx vitest run src/lib/juntadas.test.ts 2>&1); then ok "003·C4 fechas en hora argentina, links de WhatsApp y código (Vitest)"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "003·C4 Vitest"; ev "$(printf '%s' "$out" | tail -12)"; fi
}

s3_c5_app() {
  local out
  if out=$(npx playwright test -c playwright.app.config.ts 2>&1); then ok "003·C5 /nueva y /j/<inexistente> sin sesión, 404 y 375 px sin scroll"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "003·C5 Playwright"; ev "$(printf '%s' "$out" | tail -15)"; fi
}

s3_c6_no_preview() {
  local miss=""
  [ -d .vercel/output ] || miss="$miss sin-build"
  ! grep -rqi 'vista-previa' .vercel/output 2>/dev/null || miss="$miss vista-previa-en-el-build"
  [ -f src/dev/vista-previa.astro ] || miss="$miss sin-vista-previa-en-dev"
  if [ -z "$miss" ]; then ok "003·C6 la vista previa no está en .vercel/output"; else ko "003·C6:$miss"; fi
}

s3_c7_secrets() {
  local miss="" hits
  hits=$(grep -rinE "service_role|sb_secret" src supabase scripts tests 2>/dev/null)
  [ -z "$hits" ] || miss="$miss [$hits]"
  ! git ls-files | grep -qE '(^|/)\.env$' || miss="$miss .env-versionado"
  if [ -z "$miss" ]; then ok "003·C7 sin secretos en src, supabase, scripts y tests; .env sin versionar"; else ko "003·C7:$miss"; fi
}

s3_c9_readme() {
  local miss=""
  for h in 'Login con Google' 'Migración 002' 'Métricas del experimento'; do
    grep -qE "^#{1,3} $h" README.md 2>/dev/null || miss="$miss [$h]"
  done
  if [ -z "$miss" ]; then ok "003·C9 README con Login con Google, Migración 002 y Métricas del experimento"; else ko "003·C9 faltan:$miss"; fi
}

# 003·C8 es una rúbrica sobre capturas a 375 y 1280 px de la vista previa; no corre acá.
# Evidencia de 003·C8: specs/done/003-v1-juntadas.md.

# --- Spec 004: página de privacidad -------------------------------------------------------------

PRIV=.vercel/output/static/privacidad/index.html

s4_c1_build() {
  local miss=""
  [ -f "$PRIV" ] || miss="$miss sin-html-estatico"
  [ -f "$BUILT" ] || miss="$miss sin-landing"
  # El build ya corrió en C1 (npm ci + build con el email centinela); "0 fallan" es el resultado de este run.
  if [ -z "$miss" ]; then ok "004·C1 /privacidad se prerenderiza (.vercel/output/static/privacidad/index.html)"; else ko "004·C1:$miss"; fi
}

s4_c2_sections() {
  local miss="" id t
  for id in responsable datos uso no-hacemos donde plazo derechos actualizacion; do
    grep -q "id=\"$id\"" "$PRIV" 2>/dev/null || miss="$miss id[$id]"
  done
  for t in 'Claudio Carpentino' 'foto de perfil' 'nunca tu email' 'Supabase' 'Vercel' 'Google' 'dirección IP'; do
    grep -q "$t" "$PRIV" 2>/dev/null || miss="$miss texto[$t]"
  done
  if [ -z "$miss" ]; then ok "004·C2 las 8 secciones y los textos obligatorios"; else ko "004·C2:$miss"; fi
}

s4_c3_contact() {
  local miss=""
  grep -q "mailto:$SENTINEL_EMAIL" "$PRIV" 2>/dev/null || miss="$miss mailto-del-centinela"
  grep -q 'PUBLIC_CONTACT_EMAIL' src/pages/privacidad.astro || miss="$miss variable-en-fuente"
  ! grep -Eq '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' src/pages/privacidad.astro || miss="$miss email-hardcodeado"
  if [ -z "$miss" ]; then ok "004·C3 el contacto sale de PUBLIC_CONTACT_EMAIL"; else ko "004·C3:$miss"; fi
}

s4_c4_links() {
  local miss="" n
  n=$(grep -o 'href="/privacidad"' "$BUILT" 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = "2" ] || miss="$miss landing-tiene-$n-links"
  for f in src/components/app/EntrarConGoogle.astro src/components/app/JuntadaPublica.astro; do
    grep -q 'href="/privacidad"' "$f" || miss="$miss $f"
  done
  if [ -z "$miss" ]; then ok "004·C4 /privacidad enlazada en la landing (aviso y footer), el login y la juntada pública"; else ko "004·C4:$miss"; fi
}

s4_c5_mobile() {
  local out
  if out=$(npx playwright test tests/e2e/privacidad.spec.ts 2>&1); then ok "004·C5 /privacidad a 375 px sin scroll horizontal, sin 404 ni errores de consola"
  else ko "004·C5 Playwright"; ev "$(printf '%s' "$out" | tail -10)"; fi
}

s4_c6_readme() {
  local miss=""
  grep -qE '^#{1,3} Publicar el login de Google' README.md 2>/dev/null || miss="$miss seccion"
  for u in 'https://nos-vemos-five.vercel.app/privacidad' 'nos-vemos-five.vercel.app'; do grep -qF "$u" README.md || miss="$miss [$u]"; done
  grep -qE 'https://nos-vemos-five\.vercel\.app([^/a-z]|$)' README.md || miss="$miss pagina-principal"
  grep -qiE 'sin logo|no subas (un )?logo|no (subas|cargues) ning[uú]n logo' README.md || miss="$miss advertencia-logo"
  if [ -z "$miss" ]; then ok "004·C6 README: Publicar el login de Google con las tres URLs y la advertencia del logo"; else ko "004·C6:$miss"; fi
}

# 004·C7 es una rúbrica sobre capturas a 375 y 1280 px; no corre acá.
# Evidencia de 004·C7: specs/done/004-privacidad.md.

# --- Spec 005: la landing lleva a crear una juntada -----------------------------------------------

s5_c1_header() {
  local miss="" cta
  cta=$(grep -oE '<a class="cta-link"[^>]*>[^<]*</a>' "$BUILT" 2>/dev/null)
  printf '%s' "$cta" | grep -q 'href="/nueva"' || miss="$miss href"
  printf '%s' "$cta" | grep -q '>Creá tu juntada<' || miss="$miss texto"
  ! grep -q 'Press Start: creá tu juntada' "$BUILT" 2>/dev/null || miss="$miss queda-Press-Start-creá"
  ! grep -q 'Anotame en la lista' "$BUILT" 2>/dev/null || miss="$miss queda-Anotame"
  if [ -z "$miss" ]; then ok "005·C1 el botón del header dice \"Creá tu juntada\" y lleva a /nueva"; else ko "005·C1:$miss"; fi
}

s5_c2_form() {
  local miss="" sec
  sec=$(tr '\n' ' ' < "$BUILT" 2>/dev/null | grep -oE '<section id="form-leads".*' | sed 's#</section>.*##')
  printf '%s' "$sec" | grep -q '¿Todavía no?' || miss="$miss titulo"
  printf '%s' "$sec" | grep -q 'Dejanos tu email y te avisamos de lo nuevo\.' || miss="$miss bajada"
  ! grep -q 'Sumate a la lista' "$BUILT" 2>/dev/null || miss="$miss queda-Sumate"
  if [ -z "$miss" ]; then ok "005·C2 el formulario se presenta como segunda opción (los evals de 001 sobre el formulario siguen en C2/C3/C8/C9)"; else ko "005·C2:$miss"; fi
}

s5_c3_back_link() {
  local out miss="" n
  if ! out=$(npx playwright test -c playwright.app.config.ts -g '005·C3' 2>&1); then miss="$miss playwright"; fi
  n=$(grep -rn 'Qué es Nos Vemos' src --include=*.astro --include=*.tsx --include=*.ts | wc -l | tr -d ' ')
  [ "$n" = "1" ] || miss="$miss link-aparece-$n-veces-en-src"
  grep -q 'Qué es Nos Vemos' src/layouts/App.astro || miss="$miss no-esta-en-el-layout"
  if [ -z "$miss" ]; then ok "005·C3 /nueva y /j/<inexistente> tienen \"¿Qué es Nos Vemos?\" → / a 375 px; el link vive solo en el layout"
  else ko "005·C3:$miss"; ev "$(printf '%s' "${out:-}" | tail -10)"; fi
}

s5_c4_eval003() {
  local miss=""
  grep -q 'href="/nueva"' "$BUILT" 2>/dev/null || miss="$miss landing-sin-/nueva"
  grep -q 'href="/j/' "$BUILT" 2>/dev/null && miss="$miss landing-con-/j/"
  grep -q "! grep -q 'href=\"/j/' \"\$BUILT\"" evals/run.sh || miss="$miss 003C1-no-exige-sin-/j/"
  [ -f "$BUILT" ] || miss="$miss landing-no-prerenderizada"
  # La mutación temporal (href="/j/x" en la landing hace fallar 003·C1) está registrada en specs/done/005-landing-enlaza-v1.md.
  if [ -z "$miss" ]; then ok "005·C4 003·C1 acepta el link a /nueva y rechaza un href a /j/ (mutación registrada en la spec)"; else ko "005·C4:$miss"; fi
}

s5_c5_readme_query() {
  local out
  if out=$(npx vitest run --config vitest.db.config.ts tests/db/juntadas.test.ts -t 'README' 2>&1); then ok "005·C5 la consulta del README devuelve una fila por juntada con titulo, organizador y tasa de voto"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "005·C5 consulta del README"; ev "$(printf '%s' "$out" | grep -E '✗|×|FAIL|Tests |Error' | head -10)"; fi
}

# 005·C6 es una rúbrica sobre capturas a 375 y 1280 px; no corre acá.
# Evidencia de 005·C6: specs/done/005-landing-enlaza-v1.md.

# --- Spec 006: la landing marca qué está disponible y qué viene después ----------------------------

# Los paneles de #solucion, uno por línea (HTML construido aplanado).
s6_panels() {
  tr '\n' ' ' < "$BUILT" 2>/dev/null | grep -oE '<section id="solucion".*' | sed 's#</section>.*##' | sed 's#<div class="panel">#\n<div class="panel">#g' | grep '^<div class="panel">'
}

s6_c1_labels() {
  # Actualizado por la spec 010 (C7): "Con premios" pasó a Disponible. Quedan 2 y 2.
  local miss="" p sec t
  p=$(s6_panels)
  [ "$(printf '%s\n' "$p" | wc -l | tr -d ' ')" = "4" ] || miss="$miss paneles!=4"
  for t in 'Cierra solo' 'Con premios'; do
    printf '%s\n' "$p" | grep "$t" | grep -qE 'class="tag[^"]*"[^>]*>Disponible<' || miss="$miss [$t]"
    [ "$(printf '%s\n' "$p" | grep "$t" | grep -o '>Disponible<' | wc -l | tr -d ' ')" = "1" ] || miss="$miss [$t]-no-exactamente-1"
  done
  for t in 'Insiste por vos' 'Se repite'; do
    printf '%s\n' "$p" | grep "$t" | grep -qE 'class="tag[^"]*"[^>]*>Próximamente<' || miss="$miss [$t]"
  done
  sec=$(tr '\n' ' ' < "$BUILT" | grep -oE '<section id="solucion".*' | sed 's#</section>.*##')
  [ "$(printf '%s' "$sec" | grep -oE 'class="tag[^"]*"[^>]*>Disponible<' | wc -l | tr -d ' ')" = "2" ] || miss="$miss total-Disponible!=2"
  [ "$(printf '%s' "$sec" | grep -oE 'class="tag[^"]*"[^>]*>Próximamente<' | wc -l | tr -d ' ')" = "2" ] || miss="$miss total-Próximamente!=2"
  if [ -z "$miss" ]; then ok "006·C1 2 Disponible (Cierra solo, Con premios) y 2 Próximamente (Insiste por vos, Se repite) — actualizado por 010·C7"; else ko "006·C1:$miss"; fi
}

s6_c2_whatsapp() {
  if s6_panels | grep 'Cierra solo' | grep -q 'WhatsApp'; then ok "006·C2 el panel Cierra solo menciona WhatsApp"; else ko "006·C2 falta WhatsApp en Cierra solo"; fi
}

s6_c3_note() {
  local miss="" sec
  sec=$(tr '\n' ' ' < "$BUILT" 2>/dev/null | grep -oE '<section id="solucion".*' | sed 's#</section>.*##')
  printf '%s' "$sec" | grep -q 'Próximamente llega en las próximas versiones' || miss="$miss linea"
  printf '%s' "$sec" | grep -q 'href="#form-leads"' || miss="$miss href"
  if [ -z "$miss" ]; then ok "006·C3 la línea de abajo lleva a #form-leads"; else ko "006·C3:$miss"; fi
}

s6_c4_mobile() {
  local out
  if out=$(npx playwright test tests/e2e/etiquetas.spec.ts tests/e2e/hero-clipping.spec.ts 2>&1); then ok "006·C4 375 px sin scroll horizontal, 4 etiquetas visibles; sprites del header intactos"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "006·C4 Playwright"; ev "$(printf '%s' "$out" | tail -10)"; fi
}

# 006·C5 es una rúbrica sobre capturas a 375 y 1280 px de #solucion; no corre acá.
# Evidencia de 006·C5: specs/done/006-landing-disponible-proximamente.md.

# --- Spec 007: colores de estado en las etiquetas ----------------------------------------------

CSS=src/styles/global.css

s7_c1_colors() {
  local miss="" v
  for v in '#bbf7d0' '#14532d' '#fef08a' '#713f12'; do
    sed -n '/^:root {/,/^}/p' "$CSS" | grep -qE "^ *--[a-z-]+: $v;" || miss="$miss $v-no-es-variable-del-root"
  done
  grep -E '^\.tag-ok ' "$CSS" | grep -q 'background: var(--status-ok-bg)' || miss="$miss tag-ok-background"
  grep -E '^\.tag-ok ' "$CSS" | grep -q 'color: var(--status-ok-text)' || miss="$miss tag-ok-color"
  grep -E '^\.tag-soon ' "$CSS" | grep -q 'background: var(--status-soon-bg)' || miss="$miss tag-soon-background"
  grep -E '^\.tag-soon ' "$CSS" | grep -q 'color: var(--status-soon-text)' || miss="$miss tag-soon-color"
  if [ -z "$miss" ]; then ok "007·C1 los cuatro colores son variables del :root y .tag-ok/.tag-soon las usan"; else ko "007·C1:$miss"; fi
}

s7_c2_computed() {
  local out
  if out=$(npx playwright test tests/e2e/etiquetas-colores.spec.ts 2>&1); then ok "007·C2 colores computados de las etiquetas en la página"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "007·C2 Playwright"; ev "$(printf '%s' "$out" | tail -10)"; fi
}

s7_c3_contrast() {
  local out
  if out=$(node scripts/contrast-check.mjs 2>&1); then ok "007·C3 contraste AA (>= 4.5) de ambos pares"; ev "$(printf '%s' "$out" | tr '\n' ' ')"
  else ko "007·C3 contraste"; ev "$(printf '%s' "$out" | tail -5)"; fi
}

# 007·C4 es una rúbrica sobre capturas a 375 y 1280 px de #solucion; no corre acá.
# Evidencia de 007·C4: specs/done/007-colores-etiquetas.md.

# --- Spec 008: header animado -------------------------------------------------------------------

s8_pw() { # $1 id, $2 archivo, $3 filtro, $4 texto
  local out
  if out=$(npx playwright test "$2" -g "$3" 2>&1); then ok "008·$1 $4"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "008·$1 Playwright"; ev "$(printf '%s' "$out" | tail -12)"; fi
}
s8_c1() { s8_pw C1 tests/e2e/hero-animacion.spec.ts 'C1:' "al menos 8 elementos animados, 3 amigos (2 visibles bajo 700 px) y LEVEL CLEAR con aria-hidden"; }
s8_c2() { s8_pw C2 tests/e2e/hero-animacion.spec.ts 'C2:' "reducir movimiento: sin animación, 2 amigos bajo 700 px y 3 desde 700, sin superposición, sin cartel"; }
s8_c3() { s8_pw C3 tests/e2e/hero-animacion.spec.ts 'C3:' "running a la vista, paused fuera de la vista"; }
s8_c4() { s8_pw C4 tests/e2e/hero-animacion.spec.ts 'C4:' "CLS <= 0.01 durante 13 s"; }
s8_c5() {
  local out
  if out=$(node scripts/check-keyframes.mjs 2>&1); then ok "008·C5 solo transform y opacity en los @keyframes"; ev "$out"
  else ko "008·C5 keyframes"; ev "$out"; fi
}
s8_c6() { s8_pw C6 tests/e2e/hero-clipping.spec.ts 'C6:' "nada cortado en 6 instantes del loop a 320, 375, 640, 880, 1280 y 1920 px"; }
s8_c6b() { s8_pw C6b tests/e2e/hero-animacion.spec.ts 'C6b:' "sin superposición en LEVEL CLEAR y cada amigo camina >= 1,5 tiles (2 amigos bajo 700 px, 3 desde 700)"; }
s8_c9() { s8_pw C9 tests/e2e/hero-animacion.spec.ts 'C9:' "suelo con color sólido (pasto #84c669, tierra #eaa56c) aunque los sprites no carguen"; }
s8_c7() {
  local out
  if out=$(node -e '
    const {execSync}=require("child_process");
    const a=JSON.parse(require("fs").readFileSync("package.json","utf8"));
    const b=JSON.parse(execSync("git show main:package.json").toString());
    const k=(o)=>JSON.stringify({d:o.dependencies,v:o.devDependencies});
    if(k(a)!==k(b)){console.error("dependencies distintas de main");process.exit(1)}' 2>&1); then ok "008·C7 mismas dependencies y devDependencies que main"
  else ko "008·C7 dependencias"; ev "$out"; fi
}

# 008·C8 es una rúbrica sobre videos de un loop a 1280 y 375 px y capturas de 4 instantes; no corre acá.
# Evidencia de 008·C8: specs/done/008-header-animado.md.

# --- Spec 010: puntos, medallas, ranking, /perfil y /reglas ---------------------------------------

M3=supabase/migrations/003_premios.sql
REGLAS_HTML=.vercel/output/static/reglas/index.html

s10_c1_build() {
  # El build y la corrida completa ya los cubren 001·C1 y el resumen final de este script.
  if [ -f "$REGLAS_HTML" ] && [ -f .vercel/output/static/index.html ]; then ok "010·C1 el build incluye / y /reglas (el resumen final exige 0 fallas)"
  else ko "010·C1 falta el build o /reglas"; fi
}

s10_c2_migration() {
  local miss="" st f
  st=$(tr '\n' ' ' < "$M3" | sed 's/\$\$[^$]*\$\$/$$…$$/g' | tr ';' '\n')
  ! grep -qiE '^\s*create table' "$M3" || miss="$miss create-table"
  for f in ranking_juntada mis_premios premios_valor premios_eventos premios_medallas; do
    printf '%s\n' "$st" | awk -v f="create function public.$f(" 'index($0, f) { found=1; if (index($0, "security definer") && index($0, "set search_path")) good=1 } END { exit !(found && good) }' \
      || miss="$miss funcion[$f]"
    grep -qE "^revoke all on function public\.$f\(.*\) from public, anon, authenticated;" "$M3" || miss="$miss revoke[$f]"
  done
  ! grep -qiE '\bleads\b|alter table|\bdrop\b' "$M3" || miss="$miss toca-leads-alter-o-drop"
  [ -z "$(git diff main -- supabase/migrations/001_leads.sql supabase/migrations/002_juntadas.sql)" ] || miss="$miss 001-o-002-cambiaron"
  if [ -z "$miss" ]; then ok "010·C2 003_premios.sql: sin tablas, 5 funciones security definer con search_path y revoke, sin leads/alter/drop; 001 y 002 intactas"
  else ko "010·C2:$miss"; fi
}

s10_db() { # $1 id, $2 filtro de describe, $3 texto
  local out
  if out=$(npx vitest run --config vitest.db.config.ts tests/db/premios.test.ts -t "$2" 2>&1); then ok "010·$1 $3"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "010·$1 npm run test:db"; ev "$(printf '%s' "$out" | grep -E '✗|×|FAIL|Tests |Error' | head -15)"; fi
}
s10_c3() { s10_db C3 '010·C3' "puntos: suman, restan, ventanas, excepciones, tope y totales negativos"; }
s10_c4() { s10_db C4 '010·C4' "medallas: umbrales, Llave final, Fantasma, Redención, sin repetir, juntada de origen"; }
s10_c5() { s10_db C5 '010·C5' "ranking seguro: ajena, inexistente, sin emails, orden, permisos, < 200 ms"; }
s10_c13() {
  local out miss=""
  out=$(npx vitest run --config vitest.db.config.ts tests/db/premios.test.ts -t '010·C13' 2>&1) || miss="$miss vitest"
  # Ningún literal de puntos fuera del módulo: ni en páginas ni en componentes.
  local hits
  hits=$(grep -rnE "[>\"' (][+−-](10|5|20|30|15|3)([<\"' ),]|\$)" src/pages src/components)
  [ -z "$hits" ] || miss="$miss literal-en-pagina[$hits]"
  if [ -z "$miss" ]; then ok "010·C13 la base da exactamente los valores de src/lib/premios.ts; sin literales de puntos en páginas"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "010·C13:$miss"; ev "$(printf '%s' "$out" | grep -E '✗|×|FAIL|Tests ' | head -10)"; fi
}

s10_app() { # $1 id, $2 filtro, $3 texto
  local out
  if out=$(npx playwright test -c playwright.app.config.ts -g "$2" 2>&1); then ok "010·$1 $3"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "010·$1 Playwright"; ev "$(printf '%s' "$out" | tail -12)"; fi
}
s10_c6() { s10_app C6 '010·C6' "/perfil sin sesión muestra \"Entrar con Google\" a 375 px sin scroll horizontal"; }

s10_c7_landing() {
  local miss="" p
  p=$(s6_panels)
  for t in 'Cierra solo' 'Con premios'; do printf '%s\n' "$p" | grep "$t" | grep -qE 'class="tag tag-ok"[^>]*>Disponible<' || miss="$miss [$t]"; done
  for t in 'Insiste por vos' 'Se repite'; do printf '%s\n' "$p" | grep "$t" | grep -qE 'class="tag tag-soon"[^>]*>Próximamente<' || miss="$miss [$t]"; done
  printf '%s\n' "$p" | grep 'Con premios' | grep -q 'ranking' || miss="$miss sin-ranking"
  if [ -z "$miss" ]; then ok "010·C7 Cierra solo y Con premios Disponible (.tag-ok), las otras dos Próximamente, Con premios menciona ranking"; else ko "010·C7:$miss"; fi
}

s10_c8_privacy() {
  local miss="" html=.vercel/output/static/privacidad/index.html sec
  for id in datos uso; do
    sec=$(tr '\n' ' ' < "$html" | grep -oE "<section id=\"$id\".*" | sed 's#</section>.*##')
    case $id in
      datos) printf '%s' "$sec" | grep -q 'puntos' && printf '%s' "$sec" | grep -q 'medallas' || miss="$miss datos" ;;
      uso) printf '%s' "$sec" | grep -q 'ranking' || miss="$miss uso" ;;
    esac
  done
  if [ -z "$miss" ]; then ok "010·C8 /privacidad: #datos nombra puntos y medallas, #uso el ranking (los 004·* corren aparte)"; else ko "010·C8:$miss"; fi
}

s10_c9_no_preview() {
  local miss=""
  ! find .vercel/output -path '*vista-previa*' | grep -q . || miss="$miss ruta-vista-previa"
  ! grep -rqi 'vista-previa' .vercel/output 2>/dev/null || miss="$miss texto-vista-previa"
  if [ -z "$miss" ]; then ok "010·C9 ni vista-previa/perfil ni ninguna vista-previa en .vercel/output"; else ko "010·C9:$miss"; fi
}

s10_c11_readme() {
  if grep -qE '^#{1,3} Migración 003' README.md && grep -q '003_premios.sql' README.md; then ok "010·C11 README con la sección Migración 003"
  else ko "010·C11 falta Migración 003 en el README"; fi
}

s10_c12_reglas() {
  local miss="" out flat
  flat=$(tr '\n' ' ' < "$REGLAS_HTML" 2>/dev/null)
  for id in suman restan medallas ejemplo; do printf '%s' "$flat" | grep -q "id=\"$id\"" || miss="$miss #$id"; done
  for h in '24 h' '72 h' '12 h' '2 h'; do printf '%s' "$flat" | grep -q "$h" || miss="$miss [$h]"; done
  # Cada regla y medalla del módulo, con su nombre y (las reglas) su valor con signo.
  out=$(node --experimental-strip-types -e '
    import("./src/lib/premios.ts").then(({ REGLAS, MEDALLAS, conSigno }) => {
      for (const r of REGLAS) console.log(`R\t${r.nombre}\t${conSigno(r.puntos)}`);
      for (const m of MEDALLAS) console.log(`M\t${m.nombre}`);
    })' 2>/dev/null)
  [ "$(printf '%s\n' "$out" | grep -c '^R')" = "8" ] || miss="$miss reglas!=8"
  [ "$(printf '%s\n' "$out" | grep -c '^M')" = "7" ] || miss="$miss medallas!=7"
  while IFS=$'\t' read -r k nombre valor; do
    [ -n "$k" ] || continue
    printf '%s' "$flat" | grep -qF "$nombre" || miss="$miss [$nombre]"
    if [ "$k" = R ]; then printf '%s' "$flat" | grep -qF ">$valor<" || miss="$miss [$nombre:$valor]"; fi
  done <<< "$out"
  out=$(npx playwright test -c playwright.app.config.ts -g '010·C12' 2>&1) || miss="$miss playwright"
  if [ -z "$miss" ]; then ok "010·C12 /reglas: #suman #restan #medallas #ejemplo, 8 reglas con valor, 7 medallas, ventanas; links a /reglas"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "010·C12:$miss"; ev "$(printf '%s' "$out" | tail -10)"; fi
}

s10_contrast() {
  local out
  if out=$(node scripts/contrast-premios.mjs 2>&1); then ok "010·C10.3b contraste AA de los colores de premios (parte determinista de la rúbrica)"; ev "$(printf '%s' "$out" | tr '\n' ' ')"
  else ko "010·C10.3b contraste"; ev "$out"; fi
}

# 010·C10 es una rúbrica sobre capturas a 375 y 1280 px; la evidencia va en el PR y en
# specs/done/010-medallas-puntos.md. s10_contrast cubre su punto de contraste.

# --- Spec 011: cada medalla tiene su propio ícono -------------------------------------------------

s11_c1_build() {
  if [ -f "$REGLAS_HTML" ]; then ok "011·C1 el build incluye /reglas (el resumen final exige 0 fallas)"; else ko "011·C1 falta el build"; fi
}

s11_c2_distintos() {
  local sec n u
  sec=$(tr '\n' ' ' < "$REGLAS_HTML" 2>/dev/null | grep -oE '<section[^>]*id="medallas".*' | sed 's#</section>.*##')
  n=$(printf '%s' "$sec" | grep -oE '<svg' | wc -l | tr -d ' ')
  u=$(printf '%s' "$sec" | sed 's#<svg#\n<svg#g' | grep '^<svg' | while IFS= read -r l; do printf '%s' "$l" | sed 's#</svg>.*##' | grep -oE ' d="[^"]*"' | tr -d '\n'; echo; done | sort -u | wc -l | tr -d ' ')
  if [ "$n" = "7" ] && [ "$u" = "7" ]; then ok "011·C2 #medallas de /reglas: 7 íconos con trazados distintos"
  else ko "011·C2 svgs=$n distintos=$u"; fi
}

s11_c3_unit() {
  local out
  if out=$(npx vitest run src/lib/iconos-medallas.test.ts 2>&1); then ok "011·C3 cada medalla de premios.ts tiene ícono, distintos, apagados en un color"; ev "$(printf '%s' "$out" | grep -E 'Tests ')"
  else ko "011·C3 Vitest"; ev "$(printf '%s' "$out" | tail -12)"; fi
}

s11_c4_apagadas() {
  local out
  if out=$(npx playwright test -c playwright.app.config.ts -g '011·C4' 2>&1); then ok "011·C4 en /perfil las por ganar usan solo #4a4672 y el fondo"; ev "$(printf '%s' "$out" | grep -E 'passed')"
  else ko "011·C4 Playwright"; ev "$(printf '%s' "$out" | tail -12)"; fi
}

s11_c5_contraste() {
  local out
  if out=$(node --experimental-strip-types scripts/contrast-iconos.mjs 2>&1); then ok "011·C5.2 contraste no textual >= 3:1 de cada ícono sobre --bg y --panel"; ev "$(printf '%s' "$out" | tr '\n' ' ')"
  else ko "011·C5.2 contraste"; ev "$out"; fi
}

# 011·C5 (1, 3 y 4) es una rúbrica sobre capturas; la evidencia va en specs/done/011-iconos-medallas.md.

c1_build; c2_sections; c3_fields; c4_tests; c5_migration; c6_secrets; c7_sprites; c8_mobile; c9_privacy; c11_readme
c12_favicon; c13_no_errors; c14_hero_clipping; c15_hero_scenery; c16_readme_keys
s3_c0_paso0; s3_c1_build; s3_c2_migration; s3_c3_db; s3_c4_unit; s3_c5_app; s3_c6_no_preview; s3_c7_secrets; s3_c9_readme
s4_c1_build; s4_c2_sections; s4_c3_contact; s4_c4_links; s4_c5_mobile; s4_c6_readme
s5_c1_header; s5_c2_form; s5_c3_back_link; s5_c4_eval003; s5_c5_readme_query
s6_c1_labels; s6_c2_whatsapp; s6_c3_note; s6_c4_mobile
s7_c1_colors; s7_c2_computed; s7_c3_contrast
s8_c1; s8_c2; s8_c3; s8_c4; s8_c5; s8_c6; s8_c6b; s8_c7; s8_c9
s10_c1_build; s10_c2_migration; s10_c3; s10_c4; s10_c5; s10_c6; s10_c7_landing; s10_c8_privacy; s10_c9_no_preview; s10_c11_readme; s10_c12_reglas; s10_c13; s10_contrast
s11_c1_build; s11_c2_distintos; s11_c3_unit; s11_c4_apagadas; s11_c5_contraste

printf '%s pasan · %s fallan\n' "$passed" "$failed"
[ "$failed" = "0" ]
