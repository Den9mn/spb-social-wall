# SPB Social Wall

Dashboard ejecutivo de redes sociales para Santander Private Banking (LinkedIn e Instagram, paid y orgánico), con lectura IA.

- `index.html`, `page.css`, `page.js`: el panel.
- `runtime.js`: carga los datos de `data/` y expone la pequeña API `dash` que usa el panel.
- `data/`: instantánea del 14 de octubre de 2026 (LinkedIn Ads y Meta Ads vía Supermetrics; seguidores de Instagram por anuncio de la exportación de Meta; LinkedIn e Instagram orgánico vía Metricool).
- `sources.json`: título y descripción de cada fuente.

Sitio estático: no necesita build. Para verlo en local: `npx serve .` y abrir la URL que indique.

Los datos son de cliente: mantener el repositorio privado.
