import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const neon: TemplateDef = {
  key: "neon",
  name: "Neón",
  description: "Streetwear sin miedo: tipografía gigante en mayúsculas, verde ácido, cuenta regresiva para tus lanzamientos.",
  tags: ["streetwear", "sneakers", "ropa urbana", "drops"],
  demo: "streetwear",
  highlights: ["Cuenta regresiva del drop", "Letras con contorno corriendo", "Tarjetas que se inclinan en 3D"],
  styles: [
    { key: "acido", name: "Ácido" },
    { key: "rosa", name: "Rosa eléctrico", schemes: { base: { primary: "#ff3dcb", primaryFg: "#0b0b0b", accent: "#ff3dcb" }, accent: { bg: "#ff3dcb" } } },
    { key: "hielo", name: "Hielo", schemes: { base: { primary: "#3de0ff", primaryFg: "#0b0b0b", accent: "#3de0ff" }, accent: { bg: "#3de0ff" } } },
  ],
  doc: doc({
    template: "neon",
    settings: settings({
      schemes: {
        base: scheme("#0b0b0b", "#f2f2f2", "#c6ff3d", "#0b0b0b", "#c6ff3d", "#161616", "#262626"),
        alt: scheme("#161616", "#f2f2f2", "#c6ff3d", "#0b0b0b", "#ff3dcb", "#1f1f1f", "#2e2e2e"),
        invert: scheme("#f2f2f2", "#0b0b0b", "#0b0b0b", "#c6ff3d", "#c6ff3d", "#e2e2e2", "#0b0b0b"),
        accent: scheme("#c6ff3d", "#0b0b0b", "#0b0b0b", "#c6ff3d", "#0b0b0b", "#b4ec2c", "#0b0b0b"),
      },
      fonts: { display: "Anton", body: "Space Mono" },
      typeScale: "huge",
      headingCase: "upper",
      headingWeight: "regular",
      radius: "none",
      buttons: "hard",
      cards: "minimal",
      cardRatio: "portrait",
      motion: { reveal: "slide", hover: "tilt", intensity: "bold" },
      width: "full",
      texture: "grain",
    }),
    groups: {
      header: [
        sec("announcement", "marquee", { text: "Drop 07 este viernes · Un par por persona · Sin reposición" }, { scheme: "accent" }),
        sec("header", "minimal", { sticky: true, showSearch: true, showCategories: true, menuLabel: "Menú" }),
      ],
      footer: [sec("footer", "bigbrand", { tagline: "Hecho en la calle. Edición limitada.", showSocial: true })],
    },
    pages: {
      home: [
        sec("hero", "type", { eyebrow: "● Lanzamiento en vivo", title: "Drop 07", subtitle: "Runner Ácido. 300 pares. Cuando se acaban, se acaban.", primaryLabel: "Avísame", primaryHref: "/productos", height: "tall" }),
        sec("countdown", "boxes", { eyebrow: "Sale en", title: "Runner Ácido", endsAt: "2026-12-12T20:00", buttonLabel: "Ver el drop", buttonHref: "/productos" }, { scheme: "alt" }),
        sec("marquee", "outline", { text: "Edición limitada ✕ Sin reposición ✕ Un par por persona ✕", speed: "fast", size: "xl", tilt: true }),
        sec("product_grid", "carousel", { title: "Lo más buscado", source: "featured", limit: 10, columns: "4", showViewAll: true }),
        sec("gallery", "strip", { title: "Lookbook" }, { blocks: [
          ["image", { image: "", caption: "Look 01" }], ["image", { image: "", caption: "Look 02" }], ["image", { image: "", caption: "Look 03" }],
          ["image", { image: "", caption: "Look 04" }], ["image", { image: "", caption: "Look 05" }],
        ] }),
        sec("product_grid", "grid", { title: "Nuevo", source: "newest", limit: 8, columns: "4" }),
      ],
      product: productPage("stacked", [], "carousel"),
      collection: collectionPage("bigtype", "pills", "4"),
    },
  }),
};
