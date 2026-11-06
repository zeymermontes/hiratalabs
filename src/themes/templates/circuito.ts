import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const circuito: TemplateDef = {
  key: "circuito",
  name: "Circuito",
  description: "Limpia y técnica: mucho blanco, azul eléctrico, especificaciones claras y brillo sutil en cada tarjeta.",
  tags: ["tecnología", "gadgets", "electrónica", "accesorios"],
  demo: "tecnologia",
  highlights: ["Producto estrella con especificaciones", "Categorías en círculos", "Video del producto"],
  styles: [
    { key: "azul", name: "Azul" },
    { key: "grafito", name: "Grafito", schemes: { base: { bg: "#0d0f12", fg: "#eef1f5", primary: "#6ea8ff", primaryFg: "#0d0f12", accent: "#1c222b", muted: "#161a20", border: "#262c35" }, alt: { bg: "#161a20", fg: "#eef1f5" } } },
    { key: "verde", name: "Verde terminal", schemes: { base: { primary: "#047857", accent: "#d1fae5" }, accent: { bg: "#047857", primaryFg: "#047857" } } },
  ],
  doc: doc({
    template: "circuito",
    settings: settings({
      schemes: {
        base: scheme("#f5f6f8", "#0a0b0d", "#2b5bff", "#ffffff", "#e3e9ff", "#eceef2", "#dde1e7"),
        alt: scheme("#ffffff", "#0a0b0d", "#2b5bff", "#ffffff", "#e3e9ff", "#f1f3f6", "#e2e6ec"),
        invert: scheme("#0a0b0d", "#f5f6f8", "#6ea8ff", "#0a0b0d", "#1c222b", "#15181d", "#262c35"),
        accent: scheme("#2b5bff", "#ffffff", "#ffffff", "#2b5bff", "#c7d4ff", "#4470ff", "#6a8cff"),
      },
      fonts: { display: "Sora", body: "Inter" },
      headingWeight: "bold",
      radius: "lg",
      buttons: "solid",
      cards: "bordered",
      cardRatio: "square",
      motion: { reveal: "zoom", hover: "glow", intensity: "normal" },
      width: "wide",
    }),
    groups: {
      header: [
        sec("announcement", "static", { text: "Hasta 12 meses sin intereses · Garantía de 1 año en todo" }, { scheme: "invert" }),
        sec("header", "search", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Tecnología original, con garantía y factura.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "split", { eyebrow: "Nuevo", title: "Sonido que se siente.", subtitle: "Audífonos con cancelación de ruido y 40 horas de batería.", primaryLabel: "Comprar", primaryHref: "/productos", secondaryLabel: "Comparar modelos", secondaryHref: "/productos", shape: "rect", height: "tall" }, { scheme: "alt" }),
        sec("category_tiles", "circles", { title: "Explora", limit: 8 }),
        sec("product_grid", "featured", { title: "Destacados", source: "featured", limit: 5, columns: "4", showViewAll: true }),
        sec("features", "grid", { title: "Compra sin preocuparte" }, { scheme: "alt", blocks: [
          ["feature", { icon: "shield", title: "Garantía de 1 año", text: "Directa con nosotros, sin vueltas." }],
          ["feature", { icon: "card", title: "Meses sin intereses", text: "Con tarjetas participantes." }],
          ["feature", { icon: "truck", title: "Envío en 24 h", text: "A las principales ciudades." }],
          ["feature", { icon: "return", title: "30 días para cambiar", text: "Si no te convence, lo cambiamos." }],
        ] }),
        sec("video", "contained", { title: "Míralo en acción", url: "" }),
        sec("product_grid", "carousel", { title: "Accesorios", source: "newest", limit: 12, columns: "5" }),
      ],
      product: productPage("gallery", [
        sec("features", "grid", { title: "Incluye" }, { scheme: "alt", blocks: [
          ["feature", { icon: "shield", title: "Garantía de 1 año", text: "" }], ["feature", { icon: "truck", title: "Envío en 24 h", text: "" }],
          ["feature", { icon: "card", title: "Meses sin intereses", text: "" }], ["feature", { icon: "return", title: "30 días para cambiar", text: "" }],
        ] }),
      ], "carousel"),
      collection: collectionPage("simple", "sidebar", "4"),
    },
  }),
};
