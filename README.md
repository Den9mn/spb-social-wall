# SPB Social Wall

Dashboard ejecutivo de redes sociales para Santander Private Banking (LinkedIn paid y orgánico, Instagram orgánico), con lectura IA.

- `index.html`, `page.css`, `page.js`: el panel.
- `runtime.js`: carga los datos de `data/` y expone la pequeña API `dash` que usa el panel.
- `data/`: instantánea del 13 de octubre de 2026 (LinkedIn Ads vía Supermetrics; LinkedIn e Instagram orgánico vía Metricool).
- `sources.json`: título y descripción de cada fuente.

Sitio estático: no necesita build. Para verlo en local: `npx serve .` y abrir la URL que indique.

Los datos son de cliente: mantener el repositorio privado.
