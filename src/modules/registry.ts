/**
 * Registro de módulos de la plataforma.
 *
 * Un módulo es una capacidad que se prende o apaga por sitio: desde el chat de
 * cotización de una landing hasta el diseñador de fotolibros de una tienda. Lo
 * que el módulo HACE vive en código (aquí y en src/modules/<key>/). Lo que se
 * VENDE —si es gratis o un extra, el precio, si el dueño lo activa solo— tiene
 * un default aquí que el super admin ajusta desde el panel (tabla modules_catalog).
 *
 * Reglas:
 * - `defaultEnabled` decide qué pasa en un sitio sin fila en site_modules. Para
 *   los módulos que ya existían en landings es `true`, así nada cambia al migrar.
 * - `core` = no se puede apagar en los sitios donde aplica (una tienda sin
 *   catálogo no es una tienda).
 * - `ownerCanToggle` = el dueño lo prende/apaga sin pedir permiso. Un módulo de
 *   pago nunca lo activa el dueño por su cuenta: lo solicita y el super admin lo
 *   aprueba (o lo activa directo).
 */

export type SiteKindKey = "landing" | "store";
export type ModuleTierKey = "free" | "paid";

export type ModuleCategory =
  | "base"
  | "ventas"
  | "marketing"
  | "contenido"
  | "operacion"
  | "ia"
  | "a-la-medida";

export const MODULE_CATEGORY_LABEL: Record<ModuleCategory, string> = {
  base: "Base",
  ventas: "Ventas",
  marketing: "Marketing",
  contenido: "Contenido",
  operacion: "Operación",
  ia: "Inteligencia artificial",
  "a-la-medida": "A la medida",
};

export type ModuleDef = {
  key: string;
  name: string;
  description: string;
  category: ModuleCategory;
  /** En qué clase de sitio existe. */
  appliesTo: SiteKindKey[];
  tier: ModuleTierKey;
  /** Texto libre que se muestra junto al módulo de pago ("$299 MXN/mes"). */
  priceLabel?: string;
  ownerCanToggle: boolean;
  defaultEnabled: boolean;
  core?: boolean;
  /** Pestaña que agrega al panel del sitio cuando está activo. */
  adminTab?: { href: string; label: string };
  /** Otros módulos que deben estar activos. */
  requires?: string[];
};

export const MODULES: ModuleDef[] = [
  /* ----------------------------- compartidos ----------------------------- */
  {
    key: "forms",
    name: "Formularios de contacto",
    description: "Recibe los mensajes del sitio por correo y guárdalos en el panel aunque el correo falle.",
    category: "base",
    appliesTo: ["landing", "store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    adminTab: { href: "/submissions", label: "Mensajes" },
  },
  {
    key: "chat_ai",
    name: "Chat de cotización con IA",
    description: "Un asistente que hace las preguntas correctas al visitante y te manda el resumen como lead.",
    category: "ia",
    appliesTo: ["landing", "store"],
    tier: "paid",
    priceLabel: "Extra · se cobra por conversación",
    ownerCanToggle: false,
    defaultEnabled: true,
    adminTab: { href: "/chat", label: "Chat IA" },
  },
  {
    key: "custom_domains",
    name: "Dominio propio",
    description: "Conecta tudominio.com con certificado automático. Sin dominio propio el sitio vive en un subdominio.",
    category: "base",
    appliesTo: ["landing", "store"],
    tier: "free",
    ownerCanToggle: false,
    defaultEnabled: true,
    adminTab: { href: "/domains", label: "Dominios" },
  },
  {
    key: "reports",
    name: "Reportes",
    description: "Visitas, mensajes y conversaciones por mes, exportables a CSV.",
    category: "base",
    appliesTo: ["landing", "store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    adminTab: { href: "/reports", label: "Reportes" },
  },
  {
    key: "whatsapp_fab",
    name: "Botón flotante de WhatsApp",
    description: "Un botón fijo abajo a la derecha que abre WhatsApp con el número del sitio.",
    category: "marketing",
    appliesTo: ["landing", "store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
  },

  {
    key: "ai_assist",
    name: "Asistente de IA",
    description: "Redacta descripciones de productos, textos de la portada y respuestas a clientes con la IA de la plataforma (DeepSeek). Incluye una cuota mensual de tokens; con tu propia llave no hay límite.",
    category: "ia",
    appliesTo: ["store", "landing"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    adminTab: { href: "/ai", label: "IA" },
  },
  {
    key: "mcp_access",
    name: "Conecta tu propia IA (MCP)",
    description: "Un servidor MCP con tokens por tienda para que uses Claude, ChatGPT u otra IA tuya sobre tus productos y pedidos. Alcance limitado a tu sitio, permisos por token y bitácora.",
    category: "ia",
    appliesTo: ["store", "landing"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: false,
    adminTab: { href: "/mcp", label: "Conectar IA" },
  },

  /* ------------------------------- tienda -------------------------------- */
  {
    key: "catalog",
    name: "Catálogo de productos",
    description: "Productos, variantes, categorías, inventario y fotos.",
    category: "ventas",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: false,
    defaultEnabled: true,
    core: true,
    adminTab: { href: "/products", label: "Productos" },
  },
  {
    key: "orders",
    name: "Pedidos",
    description: "Carrito, checkout, pedidos con historial de estado y notificaciones al cliente.",
    category: "ventas",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: false,
    defaultEnabled: true,
    core: true,
    adminTab: { href: "/orders", label: "Pedidos" },
  },
  {
    key: "storefront_design",
    name: "Diseño de la tienda",
    description: "Plantilla, colores, tipografía, banners y secciones de la portada.",
    category: "contenido",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: false,
    defaultEnabled: true,
    core: true,
    adminTab: { href: "/design", label: "Diseño" },
  },
  {
    key: "payments_mercadopago",
    name: "Pagos con Mercado Pago",
    description: "Tarjeta, transferencia y efectivo con Checkout API. Cada tienda usa sus propias credenciales.",
    category: "ventas",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    requires: ["orders"],
    adminTab: { href: "/payments", label: "Pagos" },
  },
  {
    key: "customers",
    name: "Cuentas de clientes",
    description: "Registro, direcciones guardadas e historial de pedidos para los compradores.",
    category: "ventas",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    adminTab: { href: "/customers", label: "Clientes" },
  },
  {
    key: "promotions",
    name: "Promociones",
    description: "Descuentos por porcentaje, monto o 'compra X y llévate Y' con vigencia y alcance por categoría.",
    category: "marketing",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    adminTab: { href: "/promotions", label: "Promociones" },
  },
  {
    key: "promo_codes",
    name: "Códigos de descuento",
    description: "Cupones con límite de usos, mínimo de compra y vigencia.",
    category: "marketing",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: true,
    requires: ["promotions"],
  },
  {
    key: "gift_cards",
    name: "Gift cards",
    description: "Tarjetas de regalo digitales con entrega por correo y canje en el checkout.",
    category: "ventas",
    appliesTo: ["store"],
    tier: "paid",
    priceLabel: "Extra",
    ownerCanToggle: false,
    defaultEnabled: false,
    adminTab: { href: "/gift-cards", label: "Gift cards" },
  },
  {
    key: "branches",
    name: "Sucursales y recoger en tienda",
    description: "Direcciones, horarios y teléfonos de cada sucursal; opción de recoger en tienda en el checkout.",
    category: "operacion",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: false,
    adminTab: { href: "/branches", label: "Sucursales" },
  },
  {
    key: "faq",
    name: "Preguntas frecuentes",
    description: "Una página de preguntas y respuestas editable desde el panel.",
    category: "contenido",
    appliesTo: ["store"],
    tier: "free",
    ownerCanToggle: true,
    defaultEnabled: false,
    adminTab: { href: "/faq", label: "FAQ" },
  },
  {
    key: "product_customization",
    name: "Personalización de producto",
    description: "Campos y archivos que el cliente llena al comprar: textos, medidas, su propio diseño.",
    category: "a-la-medida",
    appliesTo: ["store"],
    tier: "paid",
    priceLabel: "Extra",
    ownerCanToggle: false,
    defaultEnabled: false,
    requires: ["catalog"],
  },
  {
    key: "photobook_designer",
    name: "Diseñador de fotolibros",
    description: "El cliente arma su fotolibro página por página en el navegador y la tienda recibe los pliegos listos para imprimir.",
    category: "a-la-medida",
    appliesTo: ["store"],
    tier: "paid",
    priceLabel: "Módulo a la medida",
    ownerCanToggle: false,
    defaultEnabled: false,
    requires: ["catalog", "orders"],
    adminTab: { href: "/photobooks", label: "Fotolibros" },
  },
];

export const MODULE_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.key, m]));

export function moduleDef(key: string): ModuleDef | undefined {
  return MODULE_BY_KEY[key];
}

export function modulesFor(kind: SiteKindKey): ModuleDef[] {
  return MODULES.filter((m) => m.appliesTo.includes(kind));
}
