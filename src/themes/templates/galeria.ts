import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const galeria: TemplateDef = {
  key: "galeria",
  name: "Galería",
  description: "Oscura y silenciosa: la imagen primero, muro tipo museo y menú a pantalla completa.",
  tags: ["arte", "fotografía", "joyería", "piezas únicas"],
  demo: "arte",
  category: "arte",
  highlights: ["Foto a pantalla completa", "Muro de obra con fundidos", "Menú a pantalla completa"],
  styles: [
    { key: "carbon", name: "Carbón" },
    { key: "hueso", name: "Hueso", schemes: { base: { bg: "#f1ede6", fg: "#151311", primary: "#151311", primaryFg: "#f1ede6", accent: "#8c5a3c", muted: "#e4ded4", border: "#cfc7ba" }, invert: { bg: "#151311", fg: "#f1ede6" } } },
    { key: "oxido", name: "Óxido", schemes: { base: { primary: "#c99a7c", primaryFg: "#111111", accent: "#c99a7c" } } },
  ],
  doc: doc({
    template: "galeria",
    settings: settings({
      schemes: {
        base: scheme("#111111", "#ededed", "#ededed", "#111111", "#8c5a3c", "#1f1f1f", "#2a2a2a"),
        alt: scheme("#191919", "#ededed", "#ededed", "#111111", "#8c5a3c", "#242424", "#303030"),
        invert: scheme("#ededed", "#111111", "#111111", "#ededed", "#8c5a3c", "#dcdcdc", "#c8c8c8"),
        accent: scheme("#3a2e27", "#ededed", "#ededed", "#3a2e27", "#c99a7c", "#4a3a30", "#5a4636"),
      },
      fonts: { display: "Cormorant Garamond", body: "Inter" },
      typeScale: "large",
      headingWeight: "regular",
      radius: "none",
      buttons: "outline",
      cards: "overlay",
      cardRatio: "portrait",
      motion: { reveal: "blur", hover: "zoom", intensity: "soft" },
      width: "wide",
    }),
    groups: {
      header: [sec("header", "transparent", { sticky: true, showSearch: false, showCategories: false, menuLabel: "Menú" })],
      footer: [sec("footer", "minimal", { tagline: "", showSocial: true })],
    },
    pages: {
      home: [
        sec("hero", "fullbleed", { eyebrow: "Serie de 12 piezas · 2026", title: "Mareas", subtitle: "Óleo sobre lino. Obra original con certificado.", primaryLabel: "Ver la serie", primaryHref: "/productos", height: "screen", align: "left", overlay: 35 }),
        sec("product_grid", "featured", { title: "Obra disponible", source: "featured", limit: 5, columns: "3", showViewAll: true }),
        sec("rich_text", "quote", { title: "“Pinto lo que el agua deja cuando se va.”", text: "[Nombre de la artista]" }, { scheme: "alt" }),
        sec("gallery", "masonry", { title: "Del taller" }, { blocks: [
          ["image", { image: "", caption: "Proceso" }], ["image", { image: "", caption: "Detalle" }], ["image", { image: "", caption: "Estudio" }],
          ["image", { image: "", caption: "Montaje" }], ["image", { image: "", caption: "Materiales" }], ["image", { image: "", caption: "Luz de tarde" }],
        ] }),
        sec("image_text", "full", { eyebrow: "Encargos", title: "Una pieza pensada para tu espacio.", text: "Hablemos de medidas, paleta y tiempos.", buttonLabel: "Solicitar encargo", buttonHref: "/contacto" }),
      ],
      product: productPage("wide"),
      collection: collectionPage("bigtype", "pills", "3"),
    },
  }),
};
