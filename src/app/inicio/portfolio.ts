/**
 * Sitios a la medida hechos por Hirata Labs que se muestran en la landing.
 * `shot` es el nombre de la captura en public/portafolio/ (npm run shoot-templates -- --portafolio).
 */
export type PortfolioItem = { name: string; giro: string; summary: string; url: string; shot: string };

export const PORTFOLIO: PortfolioItem[] = [
  { name: "Hirata Impresión", giro: "Imprenta", summary: "Catálogo de impresión con cotizador y dominio propio.", url: "https://www.hirataimpresion.com", shot: "hirataimpresion" },
  { name: "La Costa Parque Industrial", giro: "Bienes raíces", summary: "Bodegas y lotes industriales con mapa y formulario de contacto.", url: "https://lacosta.hiratalabs.com", shot: "lacosta" },
  { name: "GasGar", giro: "Arte", summary: "Lienzos originales y personalizados, galería y encargos.", url: "https://gasgar.hiratalabs.com", shot: "gasgar" },
];
