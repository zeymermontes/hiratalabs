import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const surco: TemplateDef = {
  key: "surco",
  name: "Surco",
  description: "Estética de fanzine: papel, tinta risográfica, letras en mayúsculas y tarjetas que se inclinan como estampas.",
  tags: ["vinilos", "libros", "música", "arte gráfico"],
  demo: "vinilos",
  category: "arte",
  highlights: ["Portada solo con tipografía", "Catálogo denso en 5 columnas", "Textura de papel"],
  styles: [
    { key: "riso", name: "Riso rosa" },
    { key: "azul", name: "Riso azul", schemes: { base: { primary: "#2f49ff", primaryFg: "#efe9dd", accent: "#ff4f8b" }, accent: { bg: "#2f49ff", fg: "#efe9dd" } } },
    { key: "verde", name: "Riso verde", schemes: { base: { primary: "#00a95c", primaryFg: "#161412", accent: "#ffe800" }, accent: { bg: "#00a95c" } } },
  ],
  doc: doc({
    template: "surco",
    settings: settings({
      schemes: {
        base: scheme("#efe9dd", "#161412", "#ff4f8b", "#161412", "#2f49ff", "#e5dccb", "#161412"),
        alt: scheme("#e5dccb", "#161412", "#2f49ff", "#efe9dd", "#ff4f8b", "#d9cfbb", "#161412"),
        invert: scheme("#161412", "#efe9dd", "#ff4f8b", "#161412", "#ffe800", "#24211e", "#3a3632"),
        accent: scheme("#ff4f8b", "#161412", "#161412", "#efe9dd", "#2f49ff", "#ff6b9e", "#161412"),
      },
      fonts: { display: "Syne", body: "IBM Plex Mono" },
      typeScale: "large",
      headingCase: "upper",
      headingWeight: "black",
      radius: "none",
      buttons: "hard",
      cards: "polaroid",
      cardRatio: "square",
      motion: { reveal: "slide", hover: "tilt", intensity: "normal" },
      texture: "grain",
    }),
    groups: {
      header: [
        sec("announcement", "marquee", { text: "Nuevos ingresos cada jueves · Apartamos por WhatsApp · Envíos a todo México" }, { scheme: "invert" }),
        sec("header", "minimal", { sticky: true, showSearch: true, showCategories: true, menuLabel: "Menú" }),
      ],
      footer: [sec("footer", "bigbrand", { tagline: "Discos y libros para escuchar con calma.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "type", { eyebrow: "Tienda de discos · Desde 2019", title: "Ponle play a lo raro", subtitle: "Vinilos nuevos y usados, fanzines y libros de música.", primaryLabel: "Ver ingresos", primaryHref: "/productos", height: "auto" }),
        sec("marquee", "outline", { text: "Jazz ✺ Cumbia ✺ Post-punk ✺ Ambient ✺ Son ✺", speed: "slow", size: "xl", tilt: false }),
        sec("product_grid", "grid", { title: "Llegó esta semana", source: "newest", limit: 10, columns: "5", showViewAll: true }),
        sec("category_tiles", "pills", { title: "Por género", limit: 12 }),
        sec("rich_text", "left", { eyebrow: "La tienda", title: "Un lugar para escarbar.", text: "Cada disco usado se limpia y se revisa. Si suena mal, no se vende." }, { scheme: "accent" }),
        sec("gallery", "strip", { title: "En la tienda" }, { blocks: [
          ["image", { image: "", caption: "Cajas de usados" }], ["image", { image: "", caption: "Escucha antes de comprar" }], ["image", { image: "", caption: "Fanzines" }], ["image", { image: "", caption: "Sesión en vivo" }],
        ] }),
      ],
      product: productPage("minimal", [], "carousel"),
      collection: collectionPage("bigtype", "pills", "5"),
    },
  }),
};
