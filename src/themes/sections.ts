import type { BlockDef, SectionDef, SettingDef, Zone } from "./types";

/**
 * Biblioteca de secciones. Solo datos (sin React) para que la usen el
 * storefront, el editor del panel y el validador de plantillas. Cada sección
 * tiene variantes de diseño y ajustes tipados; el componente que la pinta
 * vive en src/components/storefront/theme/sections/.
 *
 * Para crecer la biblioteca: agrega la definición aquí, su componente en el
 * registro de render y sus estilos. Todas las plantillas la pueden usar.
 */

const CONTENT: Zone[] = ["home", "product", "collection"];

type TextExtra = { hint?: string; default?: string; placeholder?: string };
const t = (key: string, label: string, extra: TextExtra = {}): SettingDef => ({ key, type: "text", label, ...extra });
const ta = (key: string, label: string, extra: TextExtra = {}): SettingDef => ({ key, type: "textarea", label, ...extra });
const url = (key: string, label: string, def = ""): SettingDef => ({ key, type: "url", label, default: def });
const img = (key: string, label: string, hint?: string): SettingDef => ({ key, type: "image", label, hint });
const toggle = (key: string, label: string, def = false, hint?: string): SettingDef => ({ key, type: "toggle", label, default: def, hint });
const select = (key: string, label: string, options: [string, string][], def?: string, hint?: string): SettingDef =>
  ({ key, type: "select", label, options: options.map(([value, l]) => ({ value, label: l })), default: def ?? options[0][0], hint });
const range = (key: string, label: string, min: number, max: number, def: number, step = 1, unit?: string): SettingDef =>
  ({ key, type: "range", label, min, max, default: def, step, unit });

const button = (prefix = "button", label = "Botón"): SettingDef[] => [
  t(`${prefix}Label`, `${label}: texto`),
  url(`${prefix}Href`, `${label}: enlace`),
];

export const ICONS = ["truck", "shield", "leaf", "star", "clock", "gift", "heart", "chat", "pin", "sparkle", "check", "box", "card", "return"] as const;
const ICON_LABEL: Record<(typeof ICONS)[number], string> = {
  truck: "Envío", shield: "Garantía", leaf: "Natural", star: "Estrella", clock: "Rapidez", gift: "Regalo", heart: "Corazón",
  chat: "Atención", pin: "Ubicación", sparkle: "Destello", check: "Palomita", box: "Caja", card: "Pago", return: "Devolución",
};

const FEATURE: BlockDef = {
  type: "feature", label: "Beneficio",
  settings: [select("icon", "Ícono", ICONS.map((i) => [i, ICON_LABEL[i]])), t("title", "Título"), ta("text", "Texto")],
};
const QUOTE: BlockDef = {
  type: "quote", label: "Testimonio",
  settings: [ta("text", "Lo que dijo"), t("author", "Nombre"), t("detail", "Detalle", { hint: "Ciudad, producto que compró…" })],
};
const FAQ_ITEM: BlockDef = { type: "item", label: "Pregunta", settings: [t("question", "Pregunta"), ta("answer", "Respuesta")] };
const PLACE: BlockDef = {
  type: "place", label: "Sucursal",
  settings: [t("name", "Nombre"), ta("address", "Dirección"), t("hours", "Horario"), t("phone", "Teléfono"), url("mapUrl", "Enlace a Google Maps")],
};
const PHOTO: BlockDef = { type: "image", label: "Imagen", settings: [img("image", "Imagen"), t("caption", "Pie de foto"), url("href", "Enlace")] };
const TILE: BlockDef = {
  type: "tile", label: "Mosaico",
  settings: [t("eyebrow", "Etiqueta"), t("title", "Título"), t("subtitle", "Subtítulo"), img("image", "Imagen"), url("href", "Enlace")],
};

export const SECTIONS: SectionDef[] = [
  /* ------------------------------------------------------------ encabezado */
  {
    type: "announcement", label: "Barra de anuncio", hint: "Un aviso corto arriba de todo: envíos, promociones, horarios.",
    zones: ["header"], single: true,
    variants: [
      { key: "static", label: "Fija" },
      { key: "marquee", label: "Corriendo", hint: "El texto se desplaza de lado a lado." },
      { key: "rotating", label: "Rotando", hint: "Cambia de mensaje cada pocos segundos (un mensaje por línea)." },
    ],
    settings: [ta("text", "Mensajes", { hint: "Uno por línea." }), url("href", "Enlace (opcional)")],
  },
  {
    type: "header", label: "Encabezado", hint: "Logo, menú, búsqueda, cuenta y carrito.",
    zones: ["header"], single: true, required: true,
    variants: [
      { key: "classic", label: "Clásico", hint: "Logo a la izquierda, menú al centro." },
      { key: "centered", label: "Centrado", hint: "Logo grande al centro, menú repartido a los lados." },
      { key: "minimal", label: "Mínimo", hint: "Logo y un botón Menú que abre la pantalla completa." },
      { key: "search", label: "Con buscador", hint: "Buscador grande y fila de categorías; para catálogos grandes." },
      { key: "pill", label: "Píldora flotante", hint: "Barra redondeada que flota sobre la página." },
      { key: "transparent", label: "Transparente", hint: "Sobre la portada; se vuelve sólido al hacer scroll." },
    ],
    settings: [
      toggle("sticky", "Se queda fijo al hacer scroll", true),
      toggle("showSearch", "Mostrar búsqueda", false),
      toggle("showCategories", "Mostrar categorías en el menú", true),
      t("menuLabel", "Texto del botón de menú", { default: "Menú" }),
    ],
  },

  /* ----------------------------------------------------------------- pie */
  {
    type: "footer", label: "Pie de página", hint: "Datos de contacto, enlaces y redes.",
    zones: ["footer"], single: true, required: true,
    variants: [
      { key: "columns", label: "Columnas" },
      { key: "bigbrand", label: "Marca gigante", hint: "El nombre de la tienda en letras enormes." },
      { key: "minimal", label: "Mínimo", hint: "Una sola línea." },
      { key: "centered", label: "Centrado" },
    ],
    settings: [ta("tagline", "Frase de la tienda"), toggle("showSocial", "Mostrar redes sociales", true)],
  },

  /* -------------------------------------------------------------- portada */
  {
    type: "hero", label: "Portada principal", hint: "Lo primero que se ve: título, imagen y botones.",
    zones: CONTENT,
    variants: [
      { key: "split", label: "Dividida", hint: "Texto a un lado, imagen al otro." },
      { key: "fullbleed", label: "Imagen completa", hint: "Foto de lado a lado con el texto encima." },
      { key: "editorial", label: "Editorial", hint: "Titular enorme y foto con forma." },
      { key: "carousel", label: "Carrusel de banners", hint: "Usa los banners de posición Principal." },
      { key: "bento", label: "Mosaico", hint: "Un bloque grande y varios chicos, cada uno con su enlace." },
      { key: "type", label: "Solo tipografía", hint: "Letras gigantes, sin foto." },
    ],
    settings: [
      t("eyebrow", "Etiqueta superior"), ta("title", "Título"), ta("subtitle", "Texto"),
      ...button("primary", "Botón principal"), ...button("secondary", "Botón secundario"),
      img("image", "Imagen"),
      select("shape", "Forma de la imagen", [["rect", "Rectangular"], ["arch", "Arco"], ["circle", "Círculo"], ["blob", "Orgánica"]], "rect"),
      select("height", "Alto", [["auto", "Automático"], ["tall", "Alto"], ["screen", "Pantalla completa"]], "auto"),
      select("align", "Alineación", [["left", "Izquierda"], ["center", "Centro"]], "left"),
      range("overlay", "Oscurecer imagen", 0, 80, 35, 5, "%"),
    ],
    blocks: { max: 4, types: [TILE] },
  },
  {
    type: "marquee", label: "Texto en movimiento", hint: "Una banda con texto que corre: ofertas, productos, frases.",
    zones: CONTENT,
    variants: [{ key: "band", label: "Banda sólida" }, { key: "outline", label: "Letras con contorno" }],
    settings: [
      t("text", "Texto", { hint: "Separa frases con ·" }),
      select("speed", "Velocidad", [["slow", "Lenta"], ["normal", "Normal"], ["fast", "Rápida"]], "normal"),
      select("size", "Tamaño", [["md", "Mediano"], ["lg", "Grande"], ["xl", "Enorme"]], "lg"),
      toggle("tilt", "Inclinada", false),
    ],
  },
  {
    type: "product_grid", label: "Productos", hint: "Destacados, novedades, ofertas o una categoría.",
    zones: CONTENT,
    variants: [
      { key: "grid", label: "Rejilla" },
      { key: "carousel", label: "Carrusel", hint: "Fila con desplazamiento horizontal." },
      { key: "featured", label: "Uno destacado", hint: "Un producto grande y los demás alrededor." },
      { key: "list", label: "Lista", hint: "Renglones con foto chica, ideal para menús." },
      { key: "tabs", label: "Pestañas por categoría", hint: "El cliente cambia de categoría sin salir de la portada." },
    ],
    settings: [
      t("title", "Título"), t("subtitle", "Subtítulo"),
      select("source", "Qué productos", [["featured", "Destacados"], ["newest", "Más nuevos"], ["sale", "En oferta"], ["category", "De una categoría"]], "featured"),
      { key: "category", type: "category", label: "Categoría" },
      range("limit", "Cuántos", 2, 24, 8),
      select("columns", "Columnas en escritorio", [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]], "4"),
      toggle("showViewAll", "Mostrar “Ver todo”", true),
    ],
  },
  {
    type: "category_tiles", label: "Categorías", hint: "Accesos a tus categorías con su imagen.",
    zones: CONTENT,
    variants: [
      { key: "tiles", label: "Mosaicos" }, { key: "circles", label: "Círculos" }, { key: "pills", label: "Píldoras" },
      { key: "list", label: "Lista grande", hint: "Nombres enormes, la imagen aparece al pasar el cursor." },
      { key: "mosaic", label: "Collage" },
    ],
    settings: [t("title", "Título"), range("limit", "Cuántas", 2, 12, 6)],
  },
  {
    type: "image_text", label: "Imagen con texto", hint: "Cuenta tu historia, un proceso o un producto estrella.",
    zones: CONTENT,
    variants: [
      { key: "left", label: "Imagen a la izquierda" }, { key: "right", label: "Imagen a la derecha" },
      { key: "overlap", label: "Encimadas", hint: "El texto en una tarjeta sobre la imagen." },
      { key: "full", label: "Imagen de fondo" },
    ],
    settings: [t("eyebrow", "Etiqueta"), ta("title", "Título"), ta("text", "Texto"), ...button(), img("image", "Imagen")],
  },
  {
    type: "rich_text", label: "Texto", hint: "Un mensaje, una frase o un manifiesto.",
    zones: CONTENT,
    variants: [{ key: "center", label: "Centrado" }, { key: "left", label: "A la izquierda" }, { key: "quote", label: "Cita grande" }],
    settings: [t("eyebrow", "Etiqueta"), ta("title", "Título"), ta("text", "Texto"), ...button()],
  },
  {
    type: "features", label: "Beneficios", hint: "Envíos, garantías, cómo funciona: íconos con texto corto.",
    zones: CONTENT,
    variants: [
      { key: "row", label: "En fila" }, { key: "grid", label: "Rejilla" },
      { key: "steps", label: "Pasos numerados" }, { key: "cards", label: "Tarjetas" },
    ],
    settings: [t("title", "Título"), ta("subtitle", "Texto")],
    blocks: { max: 8, types: [FEATURE] },
  },
  {
    type: "testimonials", label: "Testimonios", hint: "Lo que dicen tus clientes.",
    zones: CONTENT,
    variants: [{ key: "bigquote", label: "Una cita grande" }, { key: "cards", label: "Tarjetas" }, { key: "marquee", label: "Corriendo" }],
    settings: [t("title", "Título")],
    blocks: { max: 8, types: [QUOTE] },
  },
  {
    type: "faq", label: "Preguntas frecuentes", hint: "Respuestas rápidas antes de comprar.",
    zones: CONTENT,
    variants: [{ key: "accordion", label: "Acordeón" }, { key: "twocol", label: "Dos columnas" }],
    settings: [t("title", "Título"), ta("subtitle", "Texto")],
    blocks: { max: 20, types: [FAQ_ITEM] },
  },
  {
    type: "locations", label: "Sucursales", hint: "Dónde encontrarte: dirección, horario y mapa.",
    zones: CONTENT,
    variants: [{ key: "cards", label: "Tarjetas" }, { key: "list", label: "Lista" }],
    settings: [t("title", "Título")],
    blocks: { max: 12, types: [PLACE] },
  },
  {
    type: "gallery", label: "Galería", hint: "Fotos de tus productos, tu local o tu lookbook.",
    zones: CONTENT,
    variants: [{ key: "grid", label: "Rejilla" }, { key: "masonry", label: "Muro" }, { key: "strip", label: "Tira con desplazamiento" }],
    settings: [t("title", "Título")],
    blocks: { max: 12, types: [PHOTO] },
  },
  {
    type: "countdown", label: "Cuenta regresiva", hint: "Para lanzamientos, preventas y ofertas con fecha.",
    zones: CONTENT,
    variants: [{ key: "boxes", label: "Cajas" }, { key: "inline", label: "En línea" }],
    settings: [t("eyebrow", "Etiqueta"), ta("title", "Título"), { key: "endsAt", type: "datetime", label: "Termina", hint: "Fecha y hora de México." }, ...button()],
  },
  {
    type: "banner_strip", label: "Banda de banners", hint: "Los banners de posición Banda, uno junto a otro.",
    zones: CONTENT,
    variants: [{ key: "grid", label: "En rejilla" }, { key: "stack", label: "Apilados" }],
    settings: [t("title", "Título")],
  },
  {
    type: "cta_band", label: "Llamado a la acción", hint: "Una franja con un mensaje y un botón: cotizar, WhatsApp…",
    zones: CONTENT,
    variants: [{ key: "band", label: "Franja" }, { key: "card", label: "Tarjeta" }, { key: "split", label: "Con imagen" }],
    settings: [ta("title", "Título"), ta("subtitle", "Texto"), ...button(), img("image", "Imagen (solo en “Con imagen”)")],
  },
  {
    type: "video", label: "Video", hint: "Un video de YouTube o Vimeo.",
    zones: CONTENT,
    variants: [{ key: "contained", label: "En caja" }, { key: "full", label: "De lado a lado" }],
    settings: [t("title", "Título"), url("url", "Enlace del video")],
  },
  {
    type: "custom_html", label: "Bloque HTML", hint: "HTML libre. Se inserta tal cual: úsalo con cuidado.",
    zones: CONTENT,
    variants: [{ key: "default", label: "Normal" }],
    settings: [t("title", "Título"), { key: "html", type: "html", label: "HTML" }],
  },

  /* ----------------------------------------------------- ficha de producto */
  {
    type: "product_main", label: "Ficha del producto", hint: "Fotos, precio, opciones y botón de compra.",
    zones: ["product"], single: true, required: true,
    variants: [
      { key: "gallery", label: "Galería con miniaturas" },
      { key: "stacked", label: "Fotos apiladas", hint: "Las fotos una tras otra; la info se queda fija." },
      { key: "wide", label: "Foto grande arriba" },
      { key: "minimal", label: "Centrada y mínima" },
    ],
    settings: [toggle("stickyInfo", "La información se queda fija al bajar", true), toggle("zoomOnHover", "Acercar foto al pasar el cursor", false)],
  },
  {
    type: "related_products", label: "Productos relacionados", hint: "De la misma categoría.",
    zones: ["product"], single: true,
    variants: [{ key: "grid", label: "Rejilla" }, { key: "carousel", label: "Carrusel" }],
    settings: [t("title", "Título", { default: "También te puede gustar" }), range("limit", "Cuántos", 2, 12, 4)],
  },

  /* ------------------------------------------------------------ colección */
  {
    type: "collection_header", label: "Encabezado del catálogo", hint: "Título de la categoría o de la búsqueda.",
    zones: ["collection"], single: true,
    variants: [
      { key: "simple", label: "Sencillo" },
      { key: "banner", label: "Con imagen", hint: "Usa la imagen de la categoría o la de aquí." },
      { key: "bigtype", label: "Letras grandes" },
    ],
    settings: [img("image", "Imagen de respaldo"), t("eyebrow", "Etiqueta", { default: "Catálogo" })],
  },
  {
    type: "collection_grid", label: "Rejilla del catálogo", hint: "Productos con filtros, búsqueda y páginas.",
    zones: ["collection"], single: true, required: true,
    variants: [{ key: "pills", label: "Filtros en píldoras" }, { key: "sidebar", label: "Filtros en barra lateral" }],
    settings: [select("columns", "Columnas en escritorio", [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]], "4"), toggle("showSearch", "Mostrar búsqueda", true)],
  },
];

export const SECTION_BY_TYPE: Record<string, SectionDef> = Object.fromEntries(SECTIONS.map((s) => [s.type, s]));

export function sectionsForZone(zone: Zone): SectionDef[] {
  return SECTIONS.filter((s) => s.zones.includes(zone));
}

/** Valores por default de una lista de ajustes. */
export function defaultSettings(defs: SettingDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of defs) if (d.default !== undefined) out[d.key] = d.default;
  return out;
}
