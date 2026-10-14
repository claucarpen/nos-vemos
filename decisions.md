# nos-vemos — Decisiones

> Append-only: acá no se corrige nada. Cuatro campos por decisión — el formato está en
> `CLAUDE.md`.
>
> Nace sin entradas.

## 2026-10-13 · [landing] Mascota v0 con los colores originales del pack

**Qué se decide**: la mascota v0 es el tile 98 de Tiny Dungeon (Kenney, CC0) sin recolorear; la paleta de la UI sale del pack, sin neón.
**Por qué**: decisión del operador (2026-10-13) tras ver un recolor magenta/verde agua, que no le gustó. La unicidad de la mascota se refina después en Piskel.
**La invalidaría**: que el operador entregue una mascota propia desde Piskel.

## 2026-10-13 · [landing] Pack Tiny Dungeon (16×16) y tipografía Press Start 2P

**Qué se decide**: sprites de Tiny Dungeon (Kenney, CC0, 16×16) en `public/sprites/` con su `License.txt`; fuente Press Start 2P (OFL 1.1) solo en títulos, etiquetas y botón; el texto largo va en la fuente del sistema.
**Por qué**: Tiny Town casi no trae personajes; Pixel Platformer es 18×18. Tiny Dungeon cumple licencia, resolución, personajes y escenarios, y es el más arcade.
**La invalidaría**: que el pack deje de cubrir lo que pida el diseño, o que el texto en Press Start 2P no se lea en pantallas chicas.

## 2026-10-13 · [landing] Botón de envío color naranja del pack, contraste 7.7:1

**Qué se decide**: el botón usa `#e19a65` con texto `#181425`.
**Por qué**: es un color del pack; la relación de contraste es 7.73:1 (WCAG AA exige 4.5:1). El primer intento, magenta `#ff4fa3`, daba 5.9:1 y se descartó por la decisión de paleta.
**La invalidaría**: cambiar la paleta de la UI o el color del botón.

## 2026-10-13 · [landing] Detalles de saveLead que la spec no cerraba

**Qué se decide**: (1) `.gitignore` ignora `.env.*` salvo `.env.example`. (2) Un nombre o email inválido en el servidor responde "Revisá tu nombre y tu email e intentá de nuevo.". (3) Un `utm_source` de más de 50 caracteres se trata como inválido y guarda `directo`, no se trunca. (4) Sin `PUBLIC_CONTACT_EMAIL`, el aviso de privacidad omite la oración del email, para que el build pase sin la variable; el checklist del README exige cargarla. (5) El checklist del README pide verificar que el aviso cumpla lo que exige el país del operador; no se afirma nada legal. (6) La lógica vive en `src/lib/leads.ts` con cliente inyectable, y la Action solo lo conecta.
**Por qué**: la spec define los mensajes de éxito y de error, no estos casos; son la opción más simple y reversible.
**La invalidaría**: que la spec o el operador fijen otro comportamiento para alguno de estos casos.

## 2026-10-13 · [landing] Deuda técnica declarada: vulnerabilidad alta en path-to-regexp

**Qué se decide**: se acepta `npm audit` con 1 vulnerabilidad alta (`path-to-regexp` 4.0.0-6.2.2, GHSA-9wv6-86v2-598j) que llega por `@astrojs/vercel`. No se aplica `npm audit fix --force`.
**Por qué**: el fix baja el adaptador a la v8, un cambio incompatible con Astro 7. Es una dependencia del adaptador, no de código propio.
**La invalidaría**: que `@astrojs/vercel` publique una versión que la actualice; entonces se actualiza y se borra esta deuda.
