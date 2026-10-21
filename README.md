# SPB Social Wall

Dashboard ejecutivo de redes sociales para Santander Private Banking (LinkedIn e Instagram, paid y orgánico), con lectura IA.

- `index.html`, `page.css`, `page.js`: el panel.
- `runtime.js`: carga los datos de `data/` y expone la pequeña API `dash` que usa el panel.
- `data/`: instantánea del 14 de octubre de 2026 (LinkedIn Ads y Meta Ads vía Supermetrics; seguidores de Instagram por anuncio de la exportación de Meta; LinkedIn e Instagram orgánico vía Metricool).
  Empresas comprometidas (`empresas_ads.csv`, `aud_ads_seguidores.csv`): LinkedIn Ads vía Porter Metrics y seguidores de LinkedIn vía Metricool, 16 de octubre de 2026.
- `data/resumen.json`: titulares de la pestaña Resumen (entre 5 y 10). Cada fila es un bloque learning → gráfico → recomendación: `cifra`, `cifra_label`, `learning`, `detalle`, `grafico` (clave del catálogo `GRAFICOS` de `page.js`), `grafico_titulo`, `grafico_nota`, `recomendacion`, `responsable`, `fecha` y `ref` (id de la Lectura IA con el análisis completo). Gráficos disponibles: `objetivos`, `ig_ritmo`, `cpf_canal`, `ig_temas_cpf`, `tier_cpf`, `org_temas_ig`, `es_en`, `seniority`.
- `sources.json`: título y descripción de cada fuente.

Sitio estático: no necesita build. Para verlo en local: `npx serve .` y abrir la URL que indique.

Los datos son de cliente: mantener el repositorio privado.
