import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const taller: TemplateDef = {
  key: "taller",
  name: "Taller",
  description: "Para productos que el cliente arma: pasos claros, tarjetas tipo polaroid y preguntas resueltas.",
  tags: ["fotolibros", "personalizados", "regalos", "impresión de fotos"],
  demo: "fotolibros",
  category: "hogar",
  highlights: ["Cómo funciona en 3 pasos", "Tarjetas polaroid que se inclinan", "Reseñas corriendo"],
  styles: [
    { key: "fucsia", name: "Fucsia" },
    { key: "cielo", name: "Cielo", schemes: { base: { primary: "#1f6feb", accent: "#dbeafe" }, alt: { bg: "#e8f1ff" }, accent: { bg: "#1f6feb" } } },
    { key: "menta", name: "Menta", schemes: { base: { primary: "#0f766e", accent: "#ccfbf1" }, alt: { bg: "#e6faf6" }, accent: { bg: "#0f766e" } } },
  ],
  doc: doc({
    template: "taller",
    settings: settings({
      schemes: {
        base: scheme("#ffffff", "#1a1a1a", "#c2186b", "#ffffff", "#fce4f0", "#f7f7f7", "#e5e5e5"),
        alt: scheme("#fce4f0", "#1a1a1a", "#c2186b", "#ffffff", "#ffffff", "#f9d4e6", "#f1bcd6"),
        invert: scheme("#1a1a1a", "#ffffff", "#fce4f0", "#1a1a1a", "#c2186b", "#2a2a2a", "#3a3a3a"),
        accent: scheme("#c2186b", "#ffffff", "#ffffff", "#c2186b", "#fce4f0", "#d23d84", "#e15a99"),
      },
      fonts: { display: "Manrope", body: "Manrope" },
      headingWeight: "black",
      radius: "lg",
      buttons: "solid",
      cards: "polaroid",
      cardRatio: "square",
      motion: { reveal: "zoom", hover: "tilt", intensity: "normal" },
    }),
    groups: {
      header: [
        sec("announcement", "rotating", { text: "Listo en 10 minutos, llega en 5 días\nEnvío gratis en tu primer fotolibro\nPortada de tela sin costo extra este mes" }, { scheme: "accent" }),
        sec("header", "classic", { sticky: true, showSearch: false, showCategories: true }),
      ],
      footer: [sec("footer", "centered", { tagline: "Tus fotos merecen salir del celular.", showSocial: true })],
    },
    pages: {
      home: [
        sec("hero", "split", {
          eyebrow: "Listo en 10 minutos", title: "Tus fotos merecen salir del celular.",
          subtitle: "Elige un formato, sube tus fotos y nosotros acomodamos todo. Tú solo ajustas lo que quieras.",
          primaryLabel: "Crear el mío", primaryHref: "/productos", secondaryLabel: "Ver formatos", secondaryHref: "/productos", shape: "blob",
        }),
        sec("features", "steps", { title: "Así de fácil" }, { scheme: "alt", blocks: [
          ["feature", { icon: "box", title: "Elige el formato", text: "Tamaño, portada y páginas. Ves el precio antes de empezar." }],
          ["feature", { icon: "sparkle", title: "Sube tus fotos", text: "Desde el celular o la compu. Las acomodamos por fecha." }],
          ["feature", { icon: "gift", title: "Ajusta y pide", text: "Revisa cada página antes de pagar. Llega a tu puerta." }],
        ] }),
        sec("product_grid", "grid", { title: "Elige tu formato", source: "featured", limit: 4, columns: "4", showViewAll: true }),
        sec("testimonials", "marquee", { title: "" }, { blocks: [
          ["quote", { text: "Lo regalé en el aniversario y lloramos los dos.", author: "Cliente de ejemplo" }],
          ["quote", { text: "La calidad de impresión es increíble.", author: "Cliente de ejemplo" }],
          ["quote", { text: "Llegó antes de lo prometido.", author: "Cliente de ejemplo" }],
        ] }),
        sec("faq", "accordion", { title: "Preguntas frecuentes" }, { blocks: [
          ["item", { question: "¿Cuántas fotos necesito?", answer: "Con 30 fotos llenas un fotolibro de 24 páginas; puedes poner más por página." }],
          ["item", { question: "¿Puedo guardar y seguir después?", answer: "Sí, tu proyecto se guarda solo en tu cuenta." }],
          ["item", { question: "¿Cuánto tarda en llegar?", answer: "Lo imprimimos en 48 horas y la paquetería tarda de 2 a 4 días." }],
        ] }),
      ],
      product: productPage("minimal", [
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "check", title: "Revisas cada página", text: "" }],
          ["feature", { icon: "truck", title: "Llega en 5 días", text: "" }],
          ["feature", { icon: "heart", title: "Garantía de calidad", text: "" }],
        ] }),
      ]),
      collection: collectionPage("simple", "pills", "4"),
    },
  }),
};
