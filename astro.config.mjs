import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// Vista previa de diseño con datos de ejemplo: la ruta se inyecta solo en `astro dev`,
// así que no existe en el build de producción (spec 003, C6).
const vistaPrevia = {
  name: 'vista-previa',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command === 'dev') {
        injectRoute({ pattern: '/vista-previa/[pantalla]', entrypoint: './src/dev/vista-previa.astro', prerender: false });
      }
    },
  },
};

// `/` se prerenderiza (default de Astro). `/nueva`, `/j/[codigo]` y `/auth/*` se renderizan en el
// servidor (Vercel) con `prerender = false`; `saveLead` también corre en el servidor.
export default defineConfig({
  adapter: vercel(),
  integrations: [react(), vistaPrevia],
  // La barra de herramientas de `astro dev` tapa las capturas de la vista previa.
  devToolbar: { enabled: false },
});
