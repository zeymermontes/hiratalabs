import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const recreo: TemplateDef = {
  key: "recreo",
  name: "Recreo",
  description: "Colores primarios, letras gorditas y botones que saltan. Divertida para chicos y fácil para papás.",
  tags: ["juguetes", "ropa infantil", "didácticos", "fiestas"],
  demo: "juguetes",
  category: "hogar",
  highlights: ["Mosaico de colores en la portada", "Compra por edad", "Tarjetas tipo polaroid"],
  styles: [
    { key: "sol", name: "Sol" },
    { key: "chicle", name: "Chicle", schemes: { base: { bg: "#ffeef6", primary: "#ff3d8b", primaryFg: "#ffffff", accent: "#2ec4b6" }, accent: { bg: "#2ec4b6" } } },
    { key: "pizarra", name: "Pizarrón", schemes: { base: { bg: "#e9f7ef", primary: "#1b998b", primaryFg: "#ffffff", accent: "#ffd23f" }, accent: { bg: "#ffd23f", fg: "#1a1a2e" } } },
  ],
  doc: doc({
    template: "recreo",
    settings: settings({
      schemes: {
        base: scheme("#fff6d6", "#1a1a2e", "#3a5bff", "#ffffff", "#ff6b6b", "#ffeeb0", "#1a1a2e"),
        alt: scheme("#ffffff", "#1a1a2e", "#3a5bff", "#ffffff", "#ffd23f", "#f5f5ff", "#1a1a2e"),
        invert: scheme("#3a5bff", "#ffffff", "#ffd23f", "#1a1a2e", "#ff6b6b", "#4d6bff", "#6d86ff"),
        accent: scheme("#ff6b6b", "#1a1a2e", "#1a1a2e", "#ffffff", "#ffd23f", "#ff8585", "#1a1a2e"),
      },
      fonts: { display: "Bricolage Grotesque", body: "Quicksand" },
      typeScale: "large",
      headingWeight: "black",
      radius: "lg",
      buttons: "hard",
      cards: "polaroid",
      cardRatio: "square",
      motion: { reveal: "zoom", hover: "tilt", intensity: "bold" },
      texture: "dots",
    }),
    groups: {
      header: [
        sec("announcement", "marquee", { text: "Envío gratis desde $799 · Envolvemos para regalo sin costo · Cambios hasta 60 días" }, { scheme: "invert" }),
        sec("header", "pill", { sticky: true, showSearch: true, showCategories: true }),
      ],
      footer: [sec("footer", "bigbrand", { tagline: "Juguetes que duran más que la emoción del primer día.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "bento", { title: "¡A jugar!", subtitle: "Juguetes didácticos y divertidos." }, { blocks: [
          ["tile", { eyebrow: "Nuevo", title: "Bloques de madera", subtitle: "Para construir lo que imaginen", href: "/productos" }],
          ["tile", { title: "De 0 a 2 años", href: "/productos" }],
          ["tile", { title: "Juegos de mesa", href: "/productos" }],
          ["tile", { eyebrow: "Regalos", title: "Menos de $500", href: "/productos" }],
        ] }),
        sec("category_tiles", "circles", { title: "Compra por edad o tema", limit: 8 }),
        sec("marquee", "band", { text: "Sin pilas · Materiales seguros · Para todas las edades ·", speed: "normal", size: "lg", tilt: true }, { scheme: "accent" }),
        sec("product_grid", "carousel", { title: "Los favoritos del recreo", source: "featured", limit: 10, columns: "4", showViewAll: true }),
        sec("features", "cards", { title: "Papás tranquilos" }, { scheme: "alt", blocks: [
          ["feature", { icon: "shield", title: "Materiales seguros", text: "Pinturas no tóxicas y piezas revisadas." }],
          ["feature", { icon: "gift", title: "Listo para regalar", text: "Envoltura y tarjeta sin costo." }],
          ["feature", { icon: "return", title: "Cambios en 60 días", text: "Por si ya lo tenían." }],
        ] }),
        sec("product_grid", "grid", { title: "Recién llegados", source: "newest", limit: 8, columns: "4" }),
      ],
      product: productPage("gallery", [], "carousel"),
      collection: collectionPage("bigtype", "pills", "4"),
    },
  }),
};
