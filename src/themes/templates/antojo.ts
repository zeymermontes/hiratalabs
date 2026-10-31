import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const antojo: TemplateDef = {
  key: "antojo",
  name: "Antojo",
  description: "Para pedir comida rápido: menú en pestañas, horarios rotando, tiempos de entrega claros y WhatsApp a la mano.",
  tags: ["restaurante", "comida a domicilio", "dark kitchen", "taquería"],
  demo: "restaurante",
  highlights: ["Menú en pestañas", "Horario y tiempos rotando arriba", "Sucursales en lista"],
  styles: [
    { key: "mostaza", name: "Mostaza" },
    { key: "chile", name: "Chile", schemes: { base: { bg: "#1d0d0b", primary: "#ff4d2e", primaryFg: "#1d0d0b", accent: "#ffb703", muted: "#2a1512", border: "#3d211c" }, alt: { bg: "#2a1512" } } },
    { key: "crema", name: "Crema", schemes: { base: { bg: "#fbf3e4", fg: "#10261c", primary: "#10261c", primaryFg: "#fbf3e4", accent: "#f2b230", muted: "#f1e6cf", border: "#e0d2b5" }, invert: { bg: "#10261c", fg: "#fbf3e4" } } },
  ],
  doc: doc({
    template: "antojo",
    settings: settings({
      schemes: {
        base: scheme("#10261c", "#fbf3e4", "#f2b230", "#10261c", "#e85d3a", "#183326", "#25463a"),
        alt: scheme("#183326", "#fbf3e4", "#f2b230", "#10261c", "#e85d3a", "#1f3e2f", "#2c5242"),
        invert: scheme("#fbf3e4", "#10261c", "#10261c", "#fbf3e4", "#e85d3a", "#f1e6cf", "#e0d2b5"),
        accent: scheme("#f2b230", "#10261c", "#10261c", "#f2b230", "#e85d3a", "#f5c35c", "#10261c"),
      },
      fonts: { display: "Big Shoulders Display", body: "DM Sans" },
      typeScale: "large",
      headingCase: "upper",
      headingWeight: "black",
      radius: "md",
      buttons: "solid",
      cards: "overlay",
      cardRatio: "square",
      motion: { reveal: "rise", hover: "zoom", intensity: "normal" },
    }),
    groups: {
      header: [
        sec("announcement", "rotating", { text: "Abierto hoy de 1 pm a 11 pm\nEntrega en 35 minutos promedio\nPide por WhatsApp y paga al recibir" }, { scheme: "accent" }),
        sec("header", "pill", { sticky: true, showSearch: false, showCategories: true }),
      ],
      footer: [sec("footer", "columns", { tagline: "Cocina abierta todos los días.", showSocial: true }, { scheme: "alt" })],
    },
    pages: {
      home: [
        sec("hero", "split", { eyebrow: "Calientito y a tiempo", title: "Se te antojó, te llega.", subtitle: "Del comal a tu puerta en 35 minutos promedio.", primaryLabel: "Ver el menú", primaryHref: "/productos", secondaryLabel: "Pedir por WhatsApp", secondaryHref: "/contacto", shape: "circle", height: "tall" }),
        sec("features", "row", { title: "" }, { scheme: "accent", blocks: [
          ["feature", { icon: "clock", title: "35 min promedio", text: "Te avisamos cuando sale." }],
          ["feature", { icon: "card", title: "Paga como quieras", text: "Tarjeta, transferencia o efectivo." }],
          ["feature", { icon: "pin", title: "Recoge sin fila", text: "Tu pedido listo al llegar." }],
        ] }),
        sec("product_grid", "tabs", { title: "El menú", source: "newest", limit: 12, columns: "3", showViewAll: true }),
        sec("product_grid", "list", { title: "Bebidas y extras", source: "newest", limit: 8, columns: "2" }, { scheme: "alt" }),
        sec("locations", "list", { title: "Dónde estamos" }, { blocks: [
          ["place", { name: "Cocina centro", address: "[Dirección]", hours: "Todos los días · 1 pm a 11 pm", phone: "", mapUrl: "" }],
          ["place", { name: "Cocina norte", address: "[Dirección]", hours: "Mié a dom · 2 pm a 11 pm", phone: "", mapUrl: "" }],
        ] }),
        sec("cta_band", "band", { title: "¿Comida para tu evento u oficina?", subtitle: "Paquetes desde 10 personas.", buttonLabel: "Cotizar por WhatsApp" }, { scheme: "accent" }),
      ],
      product: productPage("minimal", [], "carousel"),
      collection: collectionPage("bigtype", "pills", "3"),
    },
  }),
};
