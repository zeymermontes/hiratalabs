import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const grid: TemplateDef = {
  key: "grid",
  name: "Grid",
  description: "Catálogo denso y directo: buscador grande, bordes duros y precios por volumen. Para tiendas con muchos productos.",
  tags: ["imprenta", "papelería", "refacciones", "catálogos grandes"],
  demo: "imprenta",
  highlights: ["Buscador al frente", "Mosaico de categorías estrella", "Sombras duras al pasar el cursor"],
  styles: [
    { key: "amarillo", name: "Amarillo" },
    { key: "cian", name: "Cian", schemes: { base: { primary: "#00b3d6", accent: "#d9f6fc" }, invert: { primary: "#00b3d6" }, accent: { bg: "#00b3d6" } } },
    { key: "naranja", name: "Naranja", schemes: { base: { primary: "#ff6a13", primaryFg: "#0a0a0a", accent: "#ffe2cf" }, invert: { primary: "#ff6a13" }, accent: { bg: "#ff6a13" } } },
  ],
  doc: doc({
    template: "grid",
    settings: settings({
      schemes: {
        base: scheme("#ffffff", "#0a0a0a", "#facc15", "#0a0a0a", "#fef9c3", "#f5f5f5", "#0a0a0a"),
        alt: scheme("#f5f5f5", "#0a0a0a", "#0a0a0a", "#facc15", "#fef9c3", "#e5e5e5", "#0a0a0a"),
        invert: scheme("#0a0a0a", "#fafafa", "#facc15", "#0a0a0a", "#262626", "#1f1f1f", "#404040"),
        accent: scheme("#facc15", "#0a0a0a", "#0a0a0a", "#facc15", "#fef08a", "#fde047", "#0a0a0a"),
      },
      fonts: { display: "Space Grotesk", body: "Inter" },
      headingWeight: "bold",
      radius: "none",
      buttons: "hard",
      cards: "bordered",
      cardRatio: "square",
      motion: { reveal: "fade", hover: "hard", intensity: "bold" },
      width: "wide",
      texture: "grid",
    }),
    groups: {
      header: [
        sec("announcement", "marquee", { text: "2×1 en volantes media carta · Lonas desde 1 m² · Tarjetas en 24 h · Envío gratis desde $1,500" }, { scheme: "invert" }),
        sec("header", "search", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Impresión rápida, precios claros y factura en cada pedido.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "bento", { title: "Tarjetas de presentación", subtitle: "Desde el ciento, listas en 24 horas.", primaryLabel: "Cotizar ahora", primaryHref: "/productos" }, {
          scheme: "accent",
          blocks: [
            ["tile", { eyebrow: "Más pedido", title: "Tarjetas de presentación", subtitle: "Couché 300 g, mate o brillante", href: "/productos" }],
            ["tile", { title: "Lonas y viniles", subtitle: "Por metro cuadrado", href: "/productos" }],
            ["tile", { title: "Sellos", href: "/productos" }],
            ["tile", { eyebrow: "¿Proyecto especial?", title: "Cotiza a medida", href: "/contacto" }],
          ],
        }),
        sec("category_tiles", "pills", { title: "Compra por categoría", limit: 10 }),
        sec("product_grid", "grid", { title: "Lo más pedido", source: "featured", limit: 10, columns: "5", showViewAll: true }),
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "clock", title: "Entrega en 48 h", text: "Hábiles, en la mayoría de productos." }],
          ["feature", { icon: "card", title: "Factura en cada pedido", text: "Pide tu CFDI al pagar." }],
          ["feature", { icon: "check", title: "Prueba antes de imprimir", text: "Te mandamos la prueba digital." }],
          ["feature", { icon: "truck", title: "Envío gratis", text: "En pedidos desde $1,500." }],
        ] }),
        sec("product_grid", "carousel", { title: "Ofertas de la semana", source: "sale", limit: 12, columns: "5" }),
        sec("cta_band", "card", { title: "¿Necesitas algo que no ves aquí?", subtitle: "Mándanos tu idea y te cotizamos en menos de una hora.", buttonLabel: "Cotizar por WhatsApp" }, { scheme: "invert" }),
      ],
      product: productPage("gallery", [
        sec("faq", "twocol", { title: "Antes de pedir" }, { blocks: [
          ["item", { question: "¿En qué formato mando mi archivo?", answer: "PDF en alta resolución con 3 mm de rebase. Si no lo tienes, te ayudamos." }],
          ["item", { question: "¿Cuánto tarda?", answer: "La mayoría de los productos sale en 48 horas hábiles después de aprobar la prueba." }],
        ] }),
      ]),
      collection: collectionPage("simple", "sidebar", "4"),
    },
  }),
};
