export const SECTION_TYPES = [
  "hero_banners", "featured_products", "category_grid", "banner_strip", "cta_band", "carousel", "custom_html",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABEL: Record<SectionType, string> = {
  hero_banners: "Portada principal (hero)",
  featured_products: "Productos destacados",
  category_grid: "Categorías",
  banner_strip: "Banda de banners",
  cta_band: "Llamado a la acción",
  carousel: "Carrusel de productos",
  custom_html: "Bloque HTML",
};

export const SECTION_HINT: Record<SectionType, string> = {
  hero_banners: "Carrusel con los banners de posición “Principal”. Sin banners, muestra el texto y la imagen que pongas aquí.",
  featured_products: "Una rejilla con los productos marcados como destacados (o los más nuevos).",
  category_grid: "Mosaico con las categorías y su imagen.",
  banner_strip: "Los banners de posición “Banda”, uno junto a otro.",
  cta_band: "Una franja de color con un mensaje y un botón (cotizar, WhatsApp…).",
  carousel: "Productos en fila con desplazamiento horizontal.",
  custom_html: "HTML libre. Se inserta tal cual: úsalo con cuidado.",
};
