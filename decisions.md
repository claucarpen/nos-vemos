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

## 2026-10-13 · [landing] Paleta RPG clásico + Tiny Town para el hero exterior, por decisión del operador

**Qué se decide**: la UI usa la paleta "RPG clásico" (fondo #1f2a1c, pasto #3f6b35, paneles #5a3e2b, contorno #2a1d0e, oro #c8a24a, pergamino #e6d3a3, texto #f1ead6, más #d9cfb3 para texto secundario). El hero es exterior: pasto, camino y árboles de Tiny Town (Kenney, CC0, 16×16), con la mascota (tile 98 original) y el cofre y la poción de Tiny Dungeon. Cada pack lleva su licencia en `public/sprites/`.
**Por qué**: decisión del operador. Los contrastes WCAG medidos: botón 6.81, texto en panel 8.10, títulos sobre fondo 10.11, etiquetas y títulos en panel 6.58, tagline oro sobre fondo 6.20, aviso de privacidad 6.27, texto del input 13.65, borde del input 6.58 (mínimos: 4.5 texto, 3 elementos gráficos). El oro sobre panel da 4.04 y falla para texto chico: por eso el oro solo se usa sobre el fondo y en el botón.
**Reemplaza a**: la paleta solo-Tiny Dungeon del 2026-10-13 (botón naranja #e19a65, contraste 7.73).
**La invalidaría**: que el operador cambie de paleta o que el oro se use como texto sobre el panel.
