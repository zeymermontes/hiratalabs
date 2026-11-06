import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const huella: TemplateDef = {
  key: "huella",
  name: "Huella",
  description: "Juguetona y amable: formas orgánicas, botones que rebotan y pestañas para perro, gato o lo que tengas.",
  tags: ["mascotas", "veterinaria", "pet shop", "suscripciones"],
  demo: "mascotas",
  highlights: ["Pestañas por mascota", "Formas orgánicas que se mueven", "Bloque de suscripción"],
  styles: [
    { key: "naranja", name: "Naranja" },
    { key: "lila", name: "Lila", schemes: { base: { primary: "#7c5cff", primaryFg: "#ffffff", accent: "#e4dcff" }, accent: { bg: "#e4dcff" } } },
    { key: "menta", name: "Menta", schemes: { base: { primary: "#12a37a", primaryFg: "#ffffff", accent: "#c8f3e4" }, accent: { bg: "#c8f3e4" } } },
  ],
  doc: doc({
    template: "huella",
    settings: settings({
      schemes: {
        base: scheme("#fff9f0", "#1e2a4a", "#ff7a3d", "#1e2a4a", "#bfe6ff", "#fff0dc", "#f0e6d6"),
        alt: scheme("#bfe6ff", "#1e2a4a", "#1e2a4a", "#fff9f0", "#ff7a3d", "#a9dcfb", "#8ccdf5"),
        invert: scheme("#1e2a4a", "#fff9f0", "#ff7a3d", "#1e2a4a", "#bfe6ff", "#2a3a62", "#3a4d7c"),
        accent: scheme("#ffc79e", "#1e2a4a", "#1e2a4a", "#fff9f0", "#fff9f0", "#ffb987", "#f3a46e"),
      },
      fonts: { display: "Fredoka", body: "Nunito" },
      headingWeight: "bold",
      radius: "full",
      buttons: "pill",
      cards: "bordered",
      cardRatio: "square",
      motion: { reveal: "zoom", hover: "lift", intensity: "bold" },
      texture: "dots",
    }),
    groups: {
      header: [
        sec("announcement", "static", { text: "Envío gratis en croquetas desde $699" }, { scheme: "invert" }),
        sec("header", "pill", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Comida, premios y juguetes elegidos con veterinarios.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "split", { eyebrow: "Para el que te recibe moviendo la cola", title: "Todo lo que tu mascota ama, en un solo lugar.", subtitle: "Te avisamos antes de que se acabe el costal.", primaryLabel: "Comprar ahora", primaryHref: "/productos", secondaryLabel: "Armar suscripción", secondaryHref: "#suscripcion", shape: "blob", height: "tall" }),
        sec("product_grid", "tabs", { title: "Favoritos de la manada", source: "featured", limit: 8, columns: "4", showViewAll: true }),
        sec("features", "cards", { title: "Por qué comprar aquí" }, { blocks: [
          ["feature", { icon: "heart", title: "Elegido con veterinarios", text: "Solo marcas que recomendaríamos a nuestras mascotas." }],
          ["feature", { icon: "truck", title: "Llega en 24 horas", text: "En tu ciudad, sin cargar costales." }],
          ["feature", { icon: "return", title: "Si no le gusta, se cambia", text: "Aunque el paquete ya esté abierto." }],
        ] }),
        sec("cta_band", "split", { title: "Su croqueta llega sola, cada mes.", subtitle: "Elige cada cuánto, pausa cuando quieras.", buttonLabel: "Armar mi suscripción", buttonHref: "/contacto" }, { scheme: "alt" }),
        sec("faq", "accordion", { title: "Preguntas de la manada" }, { blocks: [
          ["item", { question: "¿Cómo sé qué croqueta le toca?", answer: "Escríbenos con su edad, peso y raza y te recomendamos." }],
          ["item", { question: "¿Puedo pausar la suscripción?", answer: "Sí, desde tu cuenta o por WhatsApp, cuando quieras." }],
        ] }),
      ],
      product: productPage("gallery", [
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "truck", title: "Llega en 24 h", text: "" }], ["feature", { icon: "return", title: "Cambios sin drama", text: "" }],
        ] }),
      ]),
      collection: collectionPage("simple", "sidebar", "4"),
    },
  }),
};
