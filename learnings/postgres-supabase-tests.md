# Probar migraciones de Supabase sin Docker: lo que no se deduce del código

- `embedded-postgres` trae los binarios por npm; npm 11 bloquea su postinstall (symlinks de `lib/`) hasta aprobarlo: `allowScripts` en `package.json`.
- Supabase concede `all` por defecto a `anon` y `authenticated` sobre lo nuevo de `public`, y Postgres da `execute` a `public` en toda función: el shim lo reproduce; sin eso los tests de seguridad dan falsos verdes.
- En plpgsql, un parámetro con el mismo nombre que una columna (`codigo`, `titulo`) choca: `#variable_conflict use_column` y referirse al parámetro como `funcion.parametro`.
- `returns table (...)` en plpgsql crea variables con esos nombres que chocan con columnas: para funciones de una sola consulta, usar `language sql`.
- Con `search_path = ''` todo va calificado, incluido `extensions.gen_random_bytes`; `gen_random_uuid()` está en `pg_catalog` y no lo necesita.
- Un voto suma como mucho 1 a cada opción: dos opciones solo llegan juntas al quórum empatadas. El caso "llegan juntas con distintos votos" solo se prueba sembrando el estado directo en la base.
- `pkill -f <patrón>` desde un shell cuyo comando contiene el patrón se mata a sí mismo: filtrar por `comm` (`ps -eo pid,comm,args`).
