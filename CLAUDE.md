# nos-vemos

El cuerpo de una iniciativa: las specs, las decisiones y el as-built de lo que se construye acá.
La cabeza —para qué es y en qué estado está— vive en el brain que montó este repo. Este repo se
lee solo: nada de acá asume que el brain esté al alcance.

## Dónde está cada cosa

| Pregunta | Dónde | Ciclo de vida |
|---|---|---|
| Cómo está construido | `ARCHITECTURE.md` (el as-built) | Vivo, se pisa |
| Qué falta | `specs/` (+ `done/`) | Transitorio |
| Qué se decidió y por qué | `decisions.md` | **Append-only**, nunca se corrige |
| Qué aprendimos | `learnings/` | Vivo: se actualiza o se borra |
| Qué se rompió, y por qué | `docs/postmortems/` | Fechado, no se pisa |
| Evidencia de investigación | `docs/research/` | Fechada, no se pisa |
| El chequeo de cada criterio | `evals/run.sh` | Vivo: un chequeo por criterio |

## Gates

- **Gate 1**: ninguna implementación arranca sin spec aprobada.
- **Gate 2**: el merge lo hace una persona. Los agentes trabajan en ramas, nunca pushean a `main`
  ni mergean: `.claude/settings.json` les niega los dos comandos.
- El PR lleva la evidencia de los evals. El que lo revisa no reporta nada que no pueda citar
  textualmente con `archivo:línea`, ni nada sin nombrar qué se rompe.

## Definition of Done

- Los criterios de la spec pasan sus evals, con la evidencia registrada. Afirmar sin evidencia no
  es done.
- Sin regresión del camino crítico.
- Sin código de intentos abandonados en el diff.
- Sin secretos en código, docs ni commits.
- `ARCHITECTURE.md` actualizado si cambió; decisiones nuevas en `decisions.md`; lo que sirva para
  la próxima vez, en `learnings/`.
- Spec archivada en `specs/done/`. Listo para PEDIR el merge — nunca autónomo.

## Cómo se escribe

**El lector primario de estos documentos es un agente en otra sesión, sin nada de la conversación
que los produjo.**

1. **Cada regla se enuncia en un solo lugar.** Los demás documentos la referencian por ruta.
2. **Los números y los chequeos van aislados**, nunca embebidos en una oración.
3. **Sin conectores narrativos**: no instruyen y ocupan contexto.

Una decisión tiene cuatro campos y ninguno más:

```
## FECHA · [ámbito] Título que enuncia la regla, no el tema

**Qué se decide**: una o dos líneas. La regla, sin argumento.
**Por qué**: un párrafo. Uno.
**Reemplaza a**: solo si aplica, nombrando la decisión anterior.
**La invalidaría**: la condición que la haría falsa.
```

Nombres de archivo, comandos y código en inglés. La regla del idioma del producto se enuncia una
sola vez, en la constitución del repo del producto que publica `.os/core` —`CLAUDE.md` en su
raíz— y no se repite acá.

## Gotchas

<!-- Lo que hace tropezar y no se deduce abriendo un archivo va acá, una línea cada cosa. Lo que
     un `ls` ya contesta, no. Nace vacío a propósito. -->
