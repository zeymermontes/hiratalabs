import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const lumen: TemplateDef = {
  key: "lumen",
  name: "Lumen",
  description: "Editorial y espaciosa: serif en los títulos, mucho aire y fotos que se revelan como un telón.",
  tags: ["plantas", "cosmética", "artesanía", "moda lenta"],
  demo: "plantas",
  highlights: ["Foto en arco que se revela", "Segunda foto al pasar el cursor", "Historias con imagen y texto"],
  styles: [
    { key: "bosque", name: "Bosque" },
    { key: "arcilla", name: "Arcilla", schemes: { base: { bg: "#f6efe7", fg: "#2b1d16", primary: "#9c4a2f", primaryFg: "#fbf4ec", accent: "#e3c7ad", muted: "#ecdfd1", border: "#dccab7" }, invert: { bg: "#2b1d16", fg: "#f6efe7", primary: "#e3c7ad", primaryFg: "#2b1d16" } } },
    { key: "niebla", name: "Niebla", schemes: { base: { bg: "#f2f3f1", fg: "#1c1f1d", primary: "#3f4a44", primaryFg: "#f2f3f1", accent: "#c9d1cb", muted: "#e4e7e4", border: "#d3d8d4" } }, fonts: { display: "Instrument Serif" } },
  ],
  doc: doc({
    template: "lumen",
    settings: settings({
      schemes: {
        base: scheme("#f4f1ea", "#1a1a1a", "#1f3a27", "#f4f1ea", "#d9cbb0", "#e7e1d3", "#d8d2c4"),
        alt: scheme("#e7e1d3", "#1a1a1a", "#1f3a27", "#f4f1ea", "#a7b89a", "#ddd5c4", "#cfc6b3"),
        invert: scheme("#1f3a27", "#f4f1ea", "#d9cbb0", "#1f3a27", "#a7b89a", "#2c4a34", "#3a5a42"),
        accent: scheme("#a7b89a", "#1a1a1a", "#1f3a27", "#f4f1ea", "#f4f1ea", "#b9c6ad", "#8fa382"),
      },
      fonts: { display: "Fraunces", body: "Manrope" },
      headingWeight: "regular",
      radius: "sm",
      buttons: "pill",
      cards: "swap",
      cardRatio: "portrait",
      motion: { reveal: "mask", hover: "zoom", intensity: "soft" },
      width: "normal",
    }),
    groups: {
      header: [
        sec("announcement", "static", { text: "Envío gratis a partir de $899 · Entregas martes y viernes" }, { scheme: "invert" }),
        sec("header", "centered", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Plantas cultivadas en vivero local, entregadas con su guía de cuidado.", showSocial: true })],
    },
    pages: {
      home: [
        sec("hero", "editorial", {
          eyebrow: "Colección de temporada", title: "Plantas que se quedan contigo.",
          subtitle: "Cultivadas en vivero local, en maceta de barro y con una guía de cuidado escrita a mano.",
          primaryLabel: "Ver la colección", primaryHref: "/productos", secondaryLabel: "Cómo cuidarlas", secondaryHref: "#cuidados",
          shape: "arch", height: "tall",
        }),
        sec("product_grid", "grid", { title: "Recién llegadas", source: "newest", limit: 8, columns: "4", showViewAll: true }),
        sec("image_text", "left", {
          eyebrow: "Rituales", title: "El riego es una conversación, no una rutina.",
          text: "Cada planta llega con su ficha: cuánta luz pide, cuándo regarla y cómo saber que está contenta.",
          buttonLabel: "Leer la guía", buttonHref: "/contacto",
        }, { scheme: "alt" }),
        sec("category_tiles", "list", { title: "Encuentra la tuya", limit: 6 }),
        sec("testimonials", "bigquote", { title: "" }, { blocks: [["quote", { text: "Mi monstera llegó perfecta y con instrucciones que sí entendí.", author: "Clienta de ejemplo", detail: "Edita este testimonio" }]] }),
        sec("features", "row", { title: "" }, { scheme: "invert", blocks: [
          ["feature", { icon: "leaf", title: "Vivero local", text: "Plantas aclimatadas al clima de tu ciudad." }],
          ["feature", { icon: "truck", title: "Entrega cuidada", text: "Viajan en caja ventilada, nunca en paquetería común." }],
          ["feature", { icon: "chat", title: "Te acompañamos", text: "Escríbenos si tu planta se ve triste." }],
        ] }),
      ],
      product: productPage("stacked", [
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "leaf", title: "Guía de cuidado incluida", text: "" }],
          ["feature", { icon: "return", title: "Garantía de llegada", text: "" }],
        ] }),
      ]),
      collection: collectionPage("bigtype", "pills", "4"),
    },
  }),
};
