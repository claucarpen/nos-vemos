---
status: pendiente
depends_on: [001, 003, 004]
---

# 005 — La landing lleva a crear una juntada

Conectar la landing con el producto: el botón principal del header pasa a llevar a `/nueva` para
crear una juntada, el formulario de leads queda como segunda opción para quien todavía no tiene una
juntada que organizar, y las páginas de la v1 suman un link de vuelta a la landing.

**Tipo**: feature · **Flujo**: requirements-first

## Estado previo

Ver `ARCHITECTURE.md`. En `src/pages/index.astro` el botón del header dice "Anotame en la lista" y
baja al formulario (`#form-leads`), cuyo título es "¿Te pasa lo mismo? Sumate a la lista". La spec
003 decidió que la landing no enlaza a la v1 y su eval `003·C1` lo verifica. `/nueva` y
`/j/<código>` usan el layout de la app (barra con la mascota y "NOS VEMOS"). La vista
`metricas_experimento` no muestra quién organizó cada juntada.

## Qué se construye

1. **Header de la landing**: el botón pasa a decir **"Press Start: creá tu juntada"** y lleva a
   `/nueva`. Sigue siendo el único botón principal del header.
2. **Sección del formulario**: título **"¿Todavía no?"** y bajada **"Dejanos tu email y te avisamos
   de lo nuevo."**. Campos, validación, aviso de privacidad y comportamiento sin cambios.
3. **Páginas de la v1** (`/nueva` y `/j/<código>`, en todos sus estados): un link **"¿Qué es Nos
   Vemos?"** a `/` en la barra superior o al pie, visible a 375 px.
4. **Eval `003·C1`**: deja de exigir que la landing no enlace a la v1. Pasa a exigir que el único
   enlace de la landing a la v1 sea `href="/nueva"` (ningún `href` a `/j/`) y que la landing siga
   prerenderizada.
5. **README → Métricas del experimento**: una consulta lista para pegar en el SQL Editor que
   muestra cada juntada con su título, el nombre del organizador y sus métricas, para separar las
   del operador de las de otros grupos.

## Criterios de aceptación y sus evals

Todos los evals de las specs 001 a 004 siguen pasando (con `003·C1` modificado como dice el punto 4).

| # | Criterio | Eval |
|---|---|---|
| C1 | El header lleva a crear | En el HTML construido de `/`: el botón del header contiene "Press Start: creá tu juntada" y su `href` es `/nueva`; no queda el texto "Anotame en la lista" |
| C2 | El formulario es la segunda opción | En el HTML de `/`: dentro de `#form-leads` aparecen "¿Todavía no?" y "Dejanos tu email y te avisamos de lo nuevo."; no queda "Sumate a la lista"; los evals de la spec 001 sobre el formulario siguen pasando |
| C3 | Se puede volver a la landing desde la v1 | Playwright con el stub de Supabase: en `/nueva` sin sesión y en `/j/<código-inexistente>` hay un link "¿Qué es Nos Vemos?" con `href="/"`, visible a 375 px; `grep` en el layout de la app o en sus componentes: el link existe una sola vez (no repetido por página) |
| C4 | `003·C1` refleja la decisión nueva | `evals/run.sh`: `003·C1` pasa con el link a `/nueva` y falla si la landing tuviera un `href` a `/j/` (probarlo con una mutación temporal y registrar el resultado) |
| C5 | La consulta del README funciona | `npm run test:db`: un test ejecuta textualmente la consulta del README sobre datos de prueba y devuelve una fila por juntada con `titulo`, `organizador` y la tasa de voto correcta |
| C6 | El header sigue claro | Rúbrica sobre capturas a 375 y 1280 px de la landing (header y formulario) y de `/nueva` sin sesión: (1) el botón principal se entiende como "empezar a usar"; (2) el formulario se lee como alternativa, no como competencia del botón; (3) el link de vuelta no compite con "Entrar con Google"; (4) misma paleta y tipografías |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-16): opción C. La landing enlaza a `/nueva` como acción principal; los leads
  quedan como secundaria; reemplaza la decisión de la spec 003 "la landing no enlaza a la v1".

### Delegadas al agente, con criterio

- **Dónde va el link "¿Qué es Nos Vemos?"**: el lugar del layout de la app que sea visible sin
  competir con el botón de login; uno solo, en el layout compartido.
- **Forma de la consulta del README**: la más simple que una la vista de métricas con `juntadas` y
  `perfiles`; solo lectura.

### Condiciones de parada

- Si algo exige tocar la base (tablas, funciones, la vista) o la lógica de la v1.
- Si el cambio del header rompe algún eval de la spec 002 (sprites cortados, favicon) y la única
  salida es cambiar el escenario.
- Contradicción entre criterios o una decisión que ninguna lista cubre.

## Efectos que escapan del sistema

**Ninguno durante la implementación.** Al publicarse, cualquier visitante de la landing puede crear
juntadas: es el efecto buscado, decidido por el operador.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Medir la conversión landing → juntada (pasar `utm_source` a la juntada) | La landing empieza a recibir tráfico de canales que valga la pena comparar |
| Cambiar los textos de Problema y Solución | El operador o los usuarios lo piden |
| Contador público de juntadas creadas | Hay suficientes juntadas como para que el número ayude |
