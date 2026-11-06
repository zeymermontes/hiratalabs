import { collectionPage, doc, productPage, scheme, sec, settings } from "../build";
import type { TemplateDef } from "../types";

export const ruta: TemplateDef = {
  key: "ruta",
  name: "Ruta",
  description: "Aventura al aire libre: tonos de montaña, letras anchas, fotos a pantalla completa y garantías que dan confianza.",
  tags: ["outdoor", "camping", "ciclismo", "viajes"],
  demo: "outdoor",
  category: "deporte",
  highlights: ["Portada a pantalla completa", "Imagen de fondo con historia", "Garantías en tarjetas"],
  styles: [
    { key: "bosque", name: "Bosque" },
    { key: "desierto", name: "Desierto", schemes: { base: { bg: "#f4ece0", primary: "#c2410c", accent: "#e9c79b" }, invert: { bg: "#3b2414" }, accent: { bg: "#c2410c" } } },
    { key: "glaciar", name: "Glaciar", schemes: { base: { bg: "#eef3f6", fg: "#13222e", primary: "#0f6ea8", accent: "#bfdbea", muted: "#e1e9ee", border: "#cbd7df" }, invert: { bg: "#13222e" } } },
  ],
  doc: doc({
    template: "ruta",
    settings: settings({
      schemes: {
        base: scheme("#ede8df", "#20302a", "#e2632b", "#ffffff", "#c9b99a", "#e2dccf", "#cfc6b4"),
        alt: scheme("#e2dccf", "#20302a", "#e2632b", "#ffffff", "#c9b99a", "#d6cebd", "#c3b9a4"),
        invert: scheme("#20302a", "#ede8df", "#e2632b", "#ffffff", "#c9b99a", "#2b3d36", "#3b5048"),
        accent: scheme("#b94a1a", "#ffffff", "#20302a", "#ffffff", "#ede8df", "#c45a2b", "#d0703f"),
      },
      fonts: { display: "Archivo", body: "Work Sans" },
      headingCase: "upper",
      headingWeight: "black",
      radius: "sm",
      buttons: "solid",
      cards: "bordered",
      cardRatio: "portrait",
      motion: { reveal: "rise", hover: "lift", intensity: "normal" },
      width: "wide",
    }),
    groups: {
      header: [sec("header", "transparent", { sticky: true, showSearch: true, showCategories: true })],
      footer: [sec("footer", "bigbrand", { tagline: "Equipo probado en la montaña, no en el escaparate.", showSocial: true }, { scheme: "invert" })],
    },
    pages: {
      home: [
        sec("hero", "fullbleed", { eyebrow: "Temporada de montaña", title: "Más lejos, más ligero.", subtitle: "Equipo de campismo y senderismo probado en rutas reales.", primaryLabel: "Equiparme", primaryHref: "/productos", secondaryLabel: "Guías de ruta", secondaryHref: "/contacto", height: "screen", overlay: 40 }),
        sec("category_tiles", "tiles", { title: "Elige tu aventura", limit: 6 }),
        sec("product_grid", "carousel", { title: "Lo más llevado a la montaña", source: "featured", limit: 10, columns: "4", showViewAll: true }),
        sec("image_text", "full", { eyebrow: "Nuestra prueba", title: "Si no aguanta 100 km, no lo vendemos.", text: "Cada producto pasa por una ruta de prueba con nuestro equipo antes de llegar a la tienda.", buttonLabel: "Cómo probamos", buttonHref: "/contacto" }),
        sec("features", "cards", { title: "Sal tranquilo" }, { scheme: "alt", blocks: [
          ["feature", { icon: "shield", title: "Garantía de por vida", text: "En costuras y cierres de mochilas." }],
          ["feature", { icon: "return", title: "Pruébalo 30 días", text: "Si no te funciona, lo cambiamos." }],
          ["feature", { icon: "pin", title: "Asesoría de ruta", text: "Te decimos qué llevar según el lugar." }],
        ] }),
        sec("testimonials", "cards", { title: "Desde la cima" }, { blocks: [
          ["quote", { text: "La tienda aguantó granizo en el Nevado sin una gota adentro.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
          ["quote", { text: "Me ayudaron a elegir la mochila correcta para mi espalda.", author: "Cliente de ejemplo", detail: "Edita este testimonio" }],
        ] }),
      ],
      product: productPage("wide", [
        sec("features", "row", { title: "" }, { scheme: "alt", blocks: [
          ["feature", { icon: "shield", title: "Garantía de por vida", text: "" }], ["feature", { icon: "return", title: "30 días de prueba", text: "" }],
        ] }),
      ], "carousel"),
      collection: collectionPage("banner", "sidebar", "4"),
    },
  }),
};
