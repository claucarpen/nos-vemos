---
status: pendiente
depends_on: [001, 005]
---

# 006 — La landing marca qué está disponible y qué viene después

La landing promete cuatro cosas y hoy funciona una. Cada promesa pasa a tener una etiqueta:
"Disponible" o "Próximamente", para que quien crea su primera juntada no espere recordatorios,
recurrencia ni premios que todavía no existen.

**Tipo**: feature · **Flujo**: requirements-first

## Estado previo

`src/pages/index.astro`, sección `#solucion` ("Nos Vemos lo resuelve por vos"): cuatro paneles
(`.panel` dentro de `.promises`) con `h3` "Cierra solo", "Insiste por vos", "Se repite" y "Con
premios", sin indicación de disponibilidad. Hoy solo funciona "Cierra solo" (v1).

## Qué se construye

1. **Etiqueta en cada panel**, junto al `h3`:
   - "Cierra solo" → **"Disponible"**. Su texto suma al final: "Y avisás al grupo por WhatsApp
     con un toque."
   - "Insiste por vos", "Se repite" y "Con premios" → **"Próximamente"**.
2. **Orden**: el panel disponible va primero (ya lo está); los tres próximos, después.
3. **Estilo**: "Disponible" se destaca (fondo lavanda, texto oscuro); "Próximamente" es discreta
   (borde, texto atenuado). Los paneles "Próximamente" no se ven deshabilitados: el texto se lee
   igual de bien.
4. **Línea debajo de los paneles**: "Lo que dice Próximamente llega en las próximas versiones.
   ¿Querés enterarte? Dejanos tu email." con "Dejanos tu email" como link a `#form-leads`.

## Criterios de aceptación y sus evals

Todos los evals de las specs 001 a 005 siguen pasando.

| # | Criterio | Eval |
|---|---|---|
| C1 | Cada promesa tiene su etiqueta correcta | En el HTML construido de `/`, dentro de `#solucion`: el panel con "Cierra solo" contiene exactamente una etiqueta "Disponible"; los paneles "Insiste por vos", "Se repite" y "Con premios" contienen cada uno "Próximamente"; en total 1 "Disponible" y 3 "Próximamente" |
| C2 | El panel disponible menciona el aviso por WhatsApp | El panel "Cierra solo" contiene "WhatsApp" |
| C3 | La línea de abajo lleva al formulario | Dentro de `#solucion` existe la línea con "Próximamente llega en las próximas versiones" y un `href="#form-leads"` |
| C4 | Se ve bien en celular | Playwright: a 375 px sin scroll horizontal; las 4 etiquetas visibles; los evals de sprites del header (spec 002) siguen pasando |
| C5 | Se entiende y no decepciona | Rúbrica sobre capturas a 375 y 1280 px de `#solucion`: (1) a simple vista se distingue qué funciona hoy y qué no; (2) "Próximamente" no parece un error ni un botón deshabilitado; (3) contraste AA de ambas etiquetas (registrar los ratios); (4) misma paleta y tipografías |

## Decisiones

### Cerradas antes de delegar

- DECIDIDO por Claudio (2026-10-19), a partir del feedback del profesor: etiquetas
  "Disponible"/"Próximamente" en las cuatro promesas; el texto de "Cierra solo" suma el aviso por
  WhatsApp; una línea que invita a dejar el email para enterarse de lo nuevo.

### Delegadas al agente, con criterio

- **Componente de la etiqueta**: lo más simple que reutilice estilos existentes y pase la rúbrica.

### Condiciones de parada

- Si algo exige tocar la v1, la base o el header de la landing.
- Contradicción entre criterios o una decisión que ninguna lista cubre.

## Efectos que escapan del sistema

Ninguno.

## Fuera de alcance, con condición de reactivación

| Fuera | Se reactiva si |
|---|---|
| Fechas estimadas para cada "Próximamente" | Hay un plan de la v2 con fecha |
| Etiquetas en `/nueva` | Algún usuario de prueba pregunta por recordatorios dentro de la app |
