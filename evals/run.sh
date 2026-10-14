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
  n=$(find public/sprites -maxdepth 1 -name '*.png' 2>/dev/null | wc -l)
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
  if out=$(npx playwright test tests/e2e/hero-clipping.spec.ts -g C15 2>&1); then ok "C15 28 sprites enteros a 1920 px; mascota, cofre y poción siempre"
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

c1_build; c2_sections; c3_fields; c4_tests; c5_migration; c6_secrets; c7_sprites; c8_mobile; c9_privacy; c11_readme
c12_favicon; c13_no_errors; c14_hero_clipping; c15_hero_scenery; c16_readme_keys


printf '%s pasan · %s fallan\n' "$passed" "$failed"
[ "$failed" = "0" ]
