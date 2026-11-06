import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const botica: TemplateDef = {
  key: "botica",
  name: "Botica",
  description: "Skincare con aire de laboratorio amable: pasteles suaves, ingredientes al frente y rutina por tipo de piel.",
  tags: ["skincare", "cosmética", "farmacia natural", "bienestar"],
  demo: "skincare",
  category: "moda",
  highlights: ["Rutina por tipo de piel en pestañas", "Ingredientes explicados", "Desenfoque suave al aparecer"],
  styles: [
    { key: "lavanda", name: "Lavanda" },
    { key: "durazno", name: "Durazno", schemes: { base: { primary: "#c4553a", accent: "#ffe1d4" }, alt: { bg: "#ffeee6" }, accent: { bg: "#ffe1d4" } } },
    { key: "pino", name: "Pino", schemes: { base: { primary: "#2f6e5a", accent: "#d6efe5" }, alt: { bg: "#e7f5ef" }, accent: { bg: "#d6efe5" } } },
  ],
  doc: doc({
    template: "botica",
    settings: settings({
      schemes: {
        base: scheme("#f7f4f2", "#232026", "#6b5bb5", "#ffffff", "#ffd9c7", "#efeae6", "#e2dbd5"),
        alt: scheme("#ece8f7", "#232026", "#6b5bb5", "#ffffff", "#ffd9c7", "#e2dcf3", "#d3cbec"),
        invert: scheme("#232026", "#f7f4f2", "#cfc6f2", "#232026", "#ffd9c7", "#2f2b33", "#403b46"),
        accent: scheme("#ffd9c7", "#232026", "#232026", "#ffffff", "#ffffff", "#ffcbb3", "#f5b79b"),
      },
      fonts: { display: "Newsreader", body: "Figtree" },
      typeScale: "large",
      headingWeight: "regular",
      radius: "lg",
      buttons: "pill",
      cards: "classic",
      cardRatio: "portrait",
      motion: { reveal: "blur", hover: "lift", intensity: "soft" },
    }),
    groups: {
      header: [
        sec("announcement", "static", { text: "Muestra gratis en cada pedido · Envío gratis desde $899" }, { scheme: "alt" }),
        sec("header", "centered", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Fórmulas cortas, ingredientes que se entienden.", showSocial: true }, { scheme: "alt" })],
    },
    pages: {
      home: [
        sec("hero", "split", { eyebrow: "Dermatológicamente probado", title: "Menos pasos, mejor piel.", subtitle: "Una rutina corta con ingredientes que se entienden.", primaryLabel: "Armar mi rutina", primaryHref: "/productos", secondaryLabel: "Ver ingredientes", secondaryHref: "#ingredientes", shape: "circle", height: "tall" }),
        sec("product_grid", "tabs", { title: "Tu rutina según tu piel", source: "featured", limit: 8, columns: "4", showViewAll: true }),
        sec("features", "grid", { title: "Lo que sí tiene", subtitle: "Y nada de lo que no necesitas." }, { scheme: "alt", blocks: [
          ["feature", { icon: "sparkle", title: "Niacinamida", text: "Unifica el tono y controla el brillo." }],
          ["feature", { icon: "leaf", title: "Centella asiática", text: "Calma la piel irritada." }],
          ["feature", { icon: "heart", title: "Ácido hialurónico", text: "Hidrata sin sentirse pesado." }],
          ["feature", { icon: "shield", title: "Sin fragancia", text: "Para pieles sensibles." }],
        ] }),
        sec("rich_text", "center", { eyebrow: "Nuestra idea", title: "La piel no necesita diez pasos.", text: "Necesita constancia y fórmulas honestas. Por eso cada producto hace una cosa y la hace bien." }),
        sec("testimonials", "bigquote", { title: "" }, { blocks: [["quote", { text: "Por fin una rutina que sí sigo todos los días.", author: "Clienta de ejemplo", detail: "Edita este testimonio" }]] }),
        sec("faq", "twocol", { title: "Preguntas frecuentes" }, { blocks: [
          ["item", { question: "¿Sirve para piel sensible?", answer: "Sí, todas las fórmulas son sin fragancia y probadas en piel sensible." }],
          ["item", { question: "¿En cuánto tiempo veo resultados?", answer: "La mayoría nota cambios entre la semana 3 y la 6." }],
          ["item", { question: "¿Prueban en animales?", answer: "No. Ninguno de nuestros productos ni ingredientes." }],
          ["item", { question: "¿Puedo combinarlos?", answer: "Sí, están pensados para usarse juntos en la misma rutina." }],
        ] }),
      ],
      product: productPage("gallery", [
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "shield", title: "Sin fragancia", text: "" }], ["feature", { icon: "heart", title: "No probado en animales", text: "" }], ["feature", { icon: "leaf", title: "Ingredientes limpios", text: "" }],
        ] }),
      ]),
      collection: collectionPage("simple", "pills", "4"),
    },
  }),
};
