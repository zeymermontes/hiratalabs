import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const pulso: TemplateDef = {
  key: "pulso",
  name: "Pulso",
  description: "Energía pura: fondo oscuro, naranja eléctrico, tipografía condensada y brillo al pasar el cursor.",
  tags: ["fitness", "suplementos", "deportes", "gimnasios"],
  demo: "fitness",
  highlights: ["Producto estrella en grande", "Cómo se usa, paso a paso", "Promoción con cuenta regresiva"],
  styles: [
    { key: "electrico", name: "Eléctrico" },
    { key: "volt", name: "Volt", schemes: { base: { primary: "#d4ff00", primaryFg: "#0b1220", accent: "#d4ff00" }, accent: { bg: "#d4ff00", fg: "#0b1220" } } },
    { key: "rojo", name: "Rojo", schemes: { base: { primary: "#ff2d55", primaryFg: "#ffffff", accent: "#ff2d55" }, accent: { bg: "#ff2d55" } } },
  ],
  doc: doc({
    template: "pulso",
    settings: settings({
      schemes: {
        base: scheme("#0b1220", "#f1f4fa", "#ff5a1f", "#0b1220", "#ff5a1f", "#141d30", "#24304a"),
        alt: scheme("#141d30", "#f1f4fa", "#ff5a1f", "#0b1220", "#7dd3fc", "#1b2740", "#2b3a5a"),
        invert: scheme("#f1f4fa", "#0b1220", "#0b1220", "#f1f4fa", "#ff5a1f", "#e1e6ef", "#c9d1de"),
        accent: scheme("#ff5a1f", "#0b1220", "#0b1220", "#ff5a1f", "#ffffff", "#ff7a47", "#0b1220"),
      },
      fonts: { display: "Big Shoulders Display", body: "Inter" },
      typeScale: "huge",
      headingCase: "upper",
      headingWeight: "black",
      radius: "sm",
      buttons: "solid",
      cards: "overlay",
      cardRatio: "portrait",
      motion: { reveal: "rise", hover: "glow", intensity: "bold" },
      width: "wide",
    }),
    groups: {
      header: [
        sec("announcement", "marquee", { text: "Envío gratis desde $999 · 3 meses sin intereses · Muestras gratis en cada pedido" }, { scheme: "accent" }),
        sec("header", "classic", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Suplementos con etiqueta clara y entrenadores que responden.", showSocial: true })],
    },
    pages: {
      home: [
        sec("hero", "fullbleed", { eyebrow: "Nueva fórmula", title: "Entrena más. Recupera mejor.", subtitle: "Proteína, creatina y pre-entreno con ingredientes que sí puedes leer.", primaryLabel: "Comprar ahora", primaryHref: "/productos", secondaryLabel: "Armar mi stack", secondaryHref: "/productos", height: "screen", overlay: 45 }),
        sec("marquee", "band", { text: "Sin azúcar añadida · Probado por laboratorio · Hecho en México ·", speed: "fast", size: "lg" }, { scheme: "accent" }),
        sec("product_grid", "featured", { title: "Los más vendidos", source: "featured", limit: 5, columns: "4", showViewAll: true }),
        sec("features", "steps", { title: "Tu rutina, en 3 pasos" }, { scheme: "alt", blocks: [
          ["feature", { icon: "sparkle", title: "Antes", text: "Pre-entreno 20 minutos antes de entrenar." }],
          ["feature", { icon: "clock", title: "Durante", text: "Electrolitos para no bajar el ritmo." }],
          ["feature", { icon: "heart", title: "Después", text: "Proteína en los primeros 45 minutos." }],
        ] }),
        sec("countdown", "inline", { eyebrow: "Promo de la semana", title: "2×1 en creatina", endsAt: "2026-12-31T23:59", buttonLabel: "Aprovechar", buttonHref: "/productos" }, { scheme: "invert" }),
        sec("testimonials", "cards", { title: "Lo dicen en el gym" }, { blocks: [
          ["quote", { text: "Se disuelve sin grumos y el sabor chocolate es otro nivel.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
          ["quote", { text: "Llegó al día siguiente con muestras de regalo.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
          ["quote", { text: "Por fin una etiqueta que entiendo.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
        ] }),
      ],
      product: productPage("gallery", [
        sec("faq", "accordion", { title: "Dudas comunes" }, { blocks: [
          ["item", { question: "¿Cómo lo tomo?", answer: "Un scoop en 300 ml de agua o leche después de entrenar." }],
          ["item", { question: "¿Tiene azúcar?", answer: "No tiene azúcar añadida. Revisa la tabla nutrimental en las fotos." }],
        ] }),
      ]),
      collection: collectionPage("bigtype", "sidebar", "4"),
    },
  }),
};
