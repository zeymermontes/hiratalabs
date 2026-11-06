import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const petalo: TemplateDef = {
  key: "petalo",
  name: "Pétalo",
  description: "Romántica y fresca: serif con itálicas, tonos rubor, entregas el mismo día al frente.",
  tags: ["florería", "regalos", "eventos", "detalles"],
  demo: "flores",
  category: "hogar",
  highlights: ["Horarios de entrega rotando", "Imagen y texto encimados", "Galería de eventos"],
  styles: [
    { key: "rubor", name: "Rubor" },
    { key: "salvia", name: "Salvia", schemes: { base: { bg: "#f3f5ef", primary: "#4f6b4a", primaryFg: "#f3f5ef", accent: "#dfe7d6", muted: "#e6ebe0" }, alt: { bg: "#e6ebe0" }, invert: { bg: "#2f402c" } } },
    { key: "durazno", name: "Durazno", schemes: { base: { bg: "#fff5ee", primary: "#c2552d", primaryFg: "#fff5ee", accent: "#ffd9c2" }, alt: { bg: "#ffe8da" } } },
  ],
  doc: doc({
    template: "petalo",
    settings: settings({
      schemes: {
        base: scheme("#fbf1f0", "#2e1a20", "#8e2c48", "#fbf1f0", "#f4d4d9", "#f6e3e3", "#eccfd2"),
        alt: scheme("#f4d4d9", "#2e1a20", "#8e2c48", "#fbf1f0", "#fbf1f0", "#efc4cb", "#e3b0b9"),
        invert: scheme("#4a1a29", "#fbf1f0", "#f4d4d9", "#4a1a29", "#c9d6c0", "#5c2536", "#6e3245"),
        accent: scheme("#c9d6c0", "#2e1a20", "#4a1a29", "#fbf1f0", "#fbf1f0", "#b9c8ae", "#a5b798"),
      },
      fonts: { display: "Playfair Display", body: "DM Sans" },
      headingWeight: "regular",
      radius: "lg",
      buttons: "pill",
      cards: "classic",
      cardRatio: "portrait",
      motion: { reveal: "fade", hover: "zoom", intensity: "soft" },
    }),
    groups: {
      header: [
        sec("announcement", "rotating", { text: "Entregas el mismo día si pides antes de las 2 pm\nTarjeta escrita a mano sin costo\nArreglos para eventos: cotiza por WhatsApp" }, { scheme: "invert" }),
        sec("header", "centered", { sticky: true, showSearch: false, showCategories: true }),
      ],
      footer: [sec("footer", "centered", { tagline: "Flores frescas, envueltas con calma.", showSocial: true }, { scheme: "alt" })],
    },
    pages: {
      home: [
        sec("hero", "editorial", { eyebrow: "Entrega hoy mismo", title: "Dilo con flores frescas.", subtitle: "Ramos armados el día de tu entrega, con tarjeta escrita a mano.", primaryLabel: "Ver ramos", primaryHref: "/productos", secondaryLabel: "Para eventos", secondaryHref: "/contacto", shape: "arch", height: "tall" }),
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "clock", title: "Mismo día", text: "Pide antes de las 2 pm." }],
          ["feature", { icon: "leaf", title: "Flor de temporada", text: "Directo del mercado cada mañana." }],
          ["feature", { icon: "gift", title: "Tarjeta a mano", text: "Escríbenos tu mensaje." }],
        ] }),
        sec("product_grid", "grid", { title: "Ramos favoritos", source: "featured", limit: 8, columns: "4", showViewAll: true }),
        sec("image_text", "overlap", { eyebrow: "Eventos", title: "Bodas, bautizos y oficinas.", text: "Diseñamos los arreglos contigo y los montamos el día del evento.", buttonLabel: "Cotizar evento", buttonHref: "/contacto" }),
        sec("gallery", "grid", { title: "Hechos con amor" }, { blocks: [
          ["image", { image: "", caption: "Boda en jardín" }], ["image", { image: "", caption: "Centro de mesa" }], ["image", { image: "", caption: "Ramo de novia" }],
          ["image", { image: "", caption: "Oficina" }], ["image", { image: "", caption: "Bautizo" }], ["image", { image: "", caption: "Aniversario" }],
        ] }),
        sec("faq", "accordion", { title: "Antes de pedir" }, { blocks: [
          ["item", { question: "¿Hasta qué hora puedo pedir para hoy?", answer: "Hasta las 2 pm para entrega el mismo día en la ciudad." }],
          ["item", { question: "¿Puedo elegir la hora de entrega?", answer: "Elige un rango de 3 horas al pagar." }],
        ] }),
      ],
      product: productPage("gallery", [
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "clock", title: "Entrega hoy", text: "" }], ["feature", { icon: "gift", title: "Tarjeta incluida", text: "" }],
        ] }),
      ]),
      collection: collectionPage("banner", "pills", "4"),
    },
  }),
};
