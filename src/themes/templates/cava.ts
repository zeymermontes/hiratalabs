import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const cava: TemplateDef = {
  key: "cava",
  name: "Cava",
  description: "Elegante y nocturna: vino profundo y dorado, serif clásica, carta en lista y revelado como telón.",
  tags: ["vinos", "mezcal", "licores", "café de especialidad"],
  demo: "vinos",
  highlights: ["Carta en formato lista", "Cita del productor", "Botones subrayados, sin cajas"],
  styles: [
    { key: "tinto", name: "Tinto" },
    { key: "agave", name: "Agave", schemes: { base: { bg: "#0f1a17", primary: "#d8c08a", accent: "#7fa18f", muted: "#18261f", border: "#2a3b33" }, alt: { bg: "#16241e" } } },
    { key: "crema", name: "Crema", schemes: { base: { bg: "#f2ebe0", fg: "#2a1418", primary: "#6b1f2a", primaryFg: "#f2ebe0", accent: "#b08a4a", muted: "#e6dccb", border: "#d4c6ae" }, invert: { bg: "#2a1418", fg: "#f2ebe0" } } },
  ],
  doc: doc({
    template: "cava",
    settings: settings({
      schemes: {
        base: scheme("#1b0e12", "#f2e9dc", "#c9a45c", "#1b0e12", "#7a2e3a", "#26151a", "#3a2228"),
        alt: scheme("#26151a", "#f2e9dc", "#c9a45c", "#1b0e12", "#7a2e3a", "#311c22", "#45292f"),
        invert: scheme("#f2e9dc", "#1b0e12", "#6b1f2a", "#f2e9dc", "#c9a45c", "#e6dccb", "#d4c6ae"),
        accent: scheme("#6b1f2a", "#f2e9dc", "#c9a45c", "#1b0e12", "#f2e9dc", "#7a2e3a", "#8e3a48"),
      },
      fonts: { display: "Bodoni Moda", body: "Inter" },
      typeScale: "large",
      headingWeight: "regular",
      radius: "none",
      buttons: "underline",
      cards: "minimal",
      cardRatio: "portrait",
      motion: { reveal: "mask", hover: "zoom", intensity: "soft" },
      texture: "grain",
    }),
    groups: {
      header: [sec("header", "transparent", { sticky: true, showSearch: false, showCategories: true })],
      footer: [sec("footer", "centered", { tagline: "Vende y consume con responsabilidad. Solo mayores de 18 años.", showSocial: true })],
    },
    pages: {
      home: [
        sec("hero", "fullbleed", { eyebrow: "Cosecha 2024", title: "Vinos de pequeños productores.", subtitle: "Botellas que no encuentras en el súper, elegidas copa por copa.", primaryLabel: "Ver la carta", primaryHref: "/productos", height: "screen", overlay: 50, align: "center" }),
        sec("rich_text", "quote", { title: "“Un vino honesto se nota desde el primer aroma.”", text: "[Nombre del productor o sommelier]" }),
        sec("product_grid", "list", { title: "La carta", subtitle: "Tintos, blancos y espumosos.", source: "featured", limit: 8, columns: "2", showViewAll: true }, { scheme: "alt" }),
        sec("image_text", "right", { eyebrow: "Catas", title: "Una noche, seis copas.", text: "Catas guiadas para grupos pequeños en nuestra cava.", buttonLabel: "Reservar lugar", buttonHref: "/contacto" }),
        sec("category_tiles", "list", { title: "Por tipo", limit: 6 }),
        sec("features", "row", { title: "" }, { scheme: "accent", blocks: [
          ["feature", { icon: "box", title: "Empaque protegido", text: "Cada botella viaja en su caja." }],
          ["feature", { icon: "star", title: "Selección curada", text: "Probamos todo lo que vendemos." }],
          ["feature", { icon: "chat", title: "Te recomendamos", text: "Dinos qué vas a cocinar." }],
        ] }),
      ],
      product: productPage("wide", [sec("rich_text", "left", { eyebrow: "Notas de cata", title: "Cuéntale a tu cliente a qué sabe.", text: "Edita esta sección con aroma, maridaje y temperatura de servicio." })]),
      collection: collectionPage("bigtype", "pills", "3"),
    },
  }),
};
