import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const nido: TemplateDef = {
  key: "nido",
  name: "Nido",
  description: "Calma de revista de interiores: serif delgada, tonos tierra, collage de espacios y fotos grandes.",
  tags: ["muebles", "decoración", "hogar", "cerámica"],
  demo: "muebles",
  category: "hogar",
  highlights: ["Collage de categorías", "Muro de inspiración", "Fotos a todo lo ancho"],
  styles: [
    { key: "terracota", name: "Terracota" },
    { key: "olivo", name: "Olivo", schemes: { base: { primary: "#5b6236", accent: "#d9d6bf" }, accent: { bg: "#5b6236", fg: "#f3eee6" } } },
    { key: "noche", name: "Noche", schemes: { base: { bg: "#1d1b18", fg: "#efe9df", primary: "#d39b72", primaryFg: "#1d1b18", accent: "#3a342d", muted: "#26231f", border: "#3a352f" }, alt: { bg: "#26231f", fg: "#efe9df" } } },
  ],
  doc: doc({
    template: "nido",
    settings: settings({
      schemes: {
        base: scheme("#f3eee6", "#26231f", "#b5603c", "#f3eee6", "#e3d5c3", "#e9e2d6", "#d8cebf"),
        alt: scheme("#e9e2d6", "#26231f", "#b5603c", "#f3eee6", "#f3eee6", "#ded5c6", "#cfc4b2"),
        invert: scheme("#26231f", "#f3eee6", "#e3d5c3", "#26231f", "#b5603c", "#332f2a", "#46403a"),
        accent: scheme("#954526", "#f3eee6", "#f3eee6", "#954526", "#e3d5c3", "#a3532f", "#b5603c"),
      },
      fonts: { display: "Instrument Serif", body: "DM Sans" },
      typeScale: "large",
      headingWeight: "regular",
      radius: "none",
      buttons: "outline",
      cards: "minimal",
      cardRatio: "landscape",
      motion: { reveal: "fade", hover: "zoom", intensity: "soft" },
      width: "wide",
    }),
    groups: {
      header: [sec("header", "classic", { sticky: true, showSearch: true, showCategories: true })],
      footer: [sec("footer", "columns", { tagline: "Piezas hechas para quedarse muchos años.", showSocial: true }, { scheme: "alt" })],
    },
    pages: {
      home: [
        sec("hero", "fullbleed", { eyebrow: "Colección otoño", title: "Espacios que se sienten como casa.", subtitle: "Muebles de madera maciza y piezas hechas a mano.", primaryLabel: "Explorar", primaryHref: "/productos", height: "tall", overlay: 30 }),
        sec("category_tiles", "mosaic", { title: "Por espacio", limit: 5 }),
        sec("product_grid", "grid", { title: "Piezas favoritas", source: "featured", limit: 6, columns: "3", showViewAll: true }),
        sec("image_text", "left", { eyebrow: "Hecho a mano", title: "Del taller a tu sala.", text: "Trabajamos con carpinteros y alfareros de la región. Cada pieza es ligeramente distinta.", buttonLabel: "Conoce el taller", buttonHref: "/contacto" }, { scheme: "alt" }),
        sec("gallery", "masonry", { title: "Inspiración" }, { blocks: [
          ["image", { image: "", caption: "Sala" }], ["image", { image: "", caption: "Comedor" }], ["image", { image: "", caption: "Recámara" }],
          ["image", { image: "", caption: "Terraza" }], ["image", { image: "", caption: "Estudio" }], ["image", { image: "", caption: "Detalle" }],
        ] }),
        sec("features", "row", { title: "" }, { blocks: [
          ["feature", { icon: "truck", title: "Entrega y armado", text: "Incluidos en tu ciudad." }],
          ["feature", { icon: "leaf", title: "Madera certificada", text: "De bosques manejados." }],
          ["feature", { icon: "shield", title: "5 años de garantía", text: "En estructura." }],
        ] }),
      ],
      product: productPage("stacked", [sec("features", "row", { title: "" }, { scheme: "alt", blocks: [["feature", { icon: "truck", title: "Entrega y armado incluidos", text: "" }], ["feature", { icon: "shield", title: "5 años de garantía", text: "" }]] })]),
      collection: collectionPage("banner", "sidebar", "3"),
    },
  }),
};
