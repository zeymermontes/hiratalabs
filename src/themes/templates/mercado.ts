import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const mercado: TemplateDef = {
  key: "mercado",
  name: "Mercado",
  description: "Cálida y local: letras grandes, botones redondos con rebote, sucursales y WhatsApp al frente.",
  tags: ["panadería", "cafetería", "comida", "retail local"],
  demo: "panaderia",
  category: "comida",
  highlights: ["Marquesina inclinada", "Menú en pestañas", "Sucursales con horario y mapa"],
  styles: [
    { key: "rojo", name: "Rojo horno" },
    { key: "verde", name: "Verde mercado", schemes: { base: { primary: "#2e7d32", primaryFg: "#fff8ec", accent: "#f4d06f" }, accent: { bg: "#2e7d32", fg: "#fff8ec" }, invert: { bg: "#1f3b22" } } },
    { key: "azul", name: "Talavera", schemes: { base: { bg: "#f7f3ea", primary: "#1d4ed8", primaryFg: "#f7f3ea", accent: "#f2b33d" }, accent: { bg: "#1d4ed8", fg: "#f7f3ea" }, invert: { bg: "#13235a" } } },
  ],
  doc: doc({
    template: "mercado",
    settings: settings({
      schemes: {
        base: scheme("#fff4e6", "#3b1d12", "#c62828", "#fff4e6", "#f2b33d", "#f8e6cc", "#3b1d12"),
        alt: scheme("#f8e6cc", "#3b1d12", "#c62828", "#fff4e6", "#f2b33d", "#f1d7b0", "#3b1d12"),
        invert: scheme("#3b1d12", "#fff4e6", "#f2b33d", "#3b1d12", "#c62828", "#4d2a1c", "#6b3d2a"),
        accent: scheme("#c62828", "#fff4e6", "#fff4e6", "#c62828", "#f2b33d", "#d84a4a", "#fff4e6"),
      },
      fonts: { display: "Bebas Neue", body: "Nunito" },
      typeScale: "large",
      headingWeight: "regular",
      radius: "full",
      buttons: "pill",
      cards: "bordered",
      cardRatio: "square",
      motion: { reveal: "zoom", hover: "lift", intensity: "bold" },
    }),
    groups: {
      header: [sec("header", "pill", { sticky: true, showSearch: false, showCategories: true })],
      footer: [sec("footer", "bigbrand", { tagline: "Recién horneado, cada mañana desde las 6.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "split", {
          eyebrow: "Hecho hoy", title: "Recién horneado, cada mañana.",
          subtitle: "Pide en línea y recoge sin hacer fila, o te lo llevamos.",
          primaryLabel: "Pedir ahora", primaryHref: "/productos", secondaryLabel: "Ver sucursales", secondaryHref: "/contacto", shape: "circle", height: "tall",
        }),
        sec("marquee", "band", { text: "Donas · Conchas · Pan de elote · Roles de canela · Café de olla", speed: "normal", size: "xl", tilt: true }, { scheme: "accent" }),
        sec("product_grid", "tabs", { title: "El menú de hoy", source: "newest", limit: 8, columns: "4", showViewAll: true }),
        sec("locations", "cards", { title: "Ven por ellas" }, { scheme: "invert", blocks: [
          ["place", { name: "Centro", address: "[Dirección de la sucursal]", hours: "Lun a sáb · 6:00 a 20:00", phone: "", mapUrl: "" }],
          ["place", { name: "Norte", address: "[Dirección de la sucursal]", hours: "Todos los días · 7:00 a 21:00", phone: "", mapUrl: "" }],
        ] }),
        sec("testimonials", "cards", { title: "Lo que dicen los vecinos" }, { blocks: [
          ["quote", { text: "Las conchas más suavecitas de la ciudad.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
          ["quote", { text: "Pido la caja de 12 cada viernes para la oficina.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
        ] }),
        sec("cta_band", "band", { title: "¿Pedido para fiesta u oficina?", subtitle: "Cajas surtidas desde una docena, con entrega a domicilio.", buttonLabel: "Cotizar por WhatsApp" }, { scheme: "accent" }),
      ],
      product: productPage("minimal", [], "carousel"),
      collection: collectionPage("bigtype", "pills", "4"),
    },
  }),
};
