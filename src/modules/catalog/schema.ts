/**
 * Módulo catálogo: productos, variantes, categorías, personalización y
 * contenido de portada. Todo cuelga de sites.id (tenant). Precios en centavos
 * (integer) para no arrastrar decimales.
 *
 * Contrato compartido: el módulo de pedidos referencia products y
 * product_variants desde aquí. No cambiar nombres de columnas sin avisar.
 */
import { sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { sites } from "@/lib/db/schema";

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);
export const customizationFieldType = pgEnum("customization_field_type", ["text", "textarea", "number", "dropdown", "file"]);
export const bannerPosition = pgEnum("banner_position", ["hero", "strip", "category"]);
export const homeSectionType = pgEnum("home_section_type", [
  "hero_banners", "featured_products", "category_grid", "banner_strip", "cta_band", "carousel", "custom_html",
]);

export type ProductImage = { url: string; alt?: string; thumbUrl?: string };

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageUrl: text("image_url"),
  /** Aparece en el menú de la tienda. */
  showInHeader: boolean("show_in_header").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("categories_site_slug_idx").on(t.siteId, t.slug),
  siteIdx: index("categories_site_idx").on(t.siteId),
}));

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  /** Precio base en centavos MXN. */
  priceCents: integer("price_cents").notNull().default(0),
  /** Precio tachado (antes), en centavos; null = sin oferta. */
  compareAtCents: integer("compare_at_cents"),
  status: productStatus("status").notNull().default("draft"),
  images: jsonb("images").$type<ProductImage[]>().notNull().default(sql`'[]'::jsonb`),
  /** null = no se controla inventario. */
  stock: integer("stock"),
  sku: text("sku"),
  isCustomizable: boolean("is_customizable").notNull().default(false),
  requiresFile: boolean("requires_file").notNull().default(false),
  /** Datos libres por módulo (p. ej. el diseñador de fotolibros guarda aquí su config). */
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("products_site_slug_idx").on(t.siteId, t.slug),
  siteStatusIdx: index("products_site_status_idx").on(t.siteId, t.status),
}));

/** Relación N:N producto-categoría. */
export const productCategories = pgTable("product_categories", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: uniqueIndex("product_categories_pk").on(t.productId, t.categoryId),
  catIdx: index("product_categories_category_idx").on(t.categoryId),
}));

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Diferencia sobre el precio base, en centavos (puede ser negativa). */
  priceDeltaCents: integer("price_delta_cents").notNull().default(0),
  sku: text("sku"),
  stock: integer("stock"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  productIdx: index("product_variants_product_idx").on(t.productId),
}));

/** Campos que el cliente llena al comprar (módulo product_customization). */
export const customizationFields = pgTable("customization_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  type: customizationFieldType("type").notNull(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  required: boolean("required").notNull().default(false),
  /** Para dropdown: [{ value, label, priceDeltaCents? }]. */
  options: jsonb("options").$type<{ value: string; label: string; priceDeltaCents?: number }[]>(),
  /** Variantes a las que aplica; vacío = todas. */
  variantIds: uuid("variant_ids").array(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  uniq: uniqueIndex("customization_fields_product_name_idx").on(t.productId, t.name),
}));

/* ---------------------------- contenido de portada ---------------------------- */

export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  mobileImageUrl: text("mobile_image_url"),
  linkUrl: text("link_url"),
  ctaLabel: text("cta_label"),
  position: bannerPosition("position").notNull().default("hero"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
}, (t) => ({
  siteIdx: index("banners_site_idx").on(t.siteId, t.position),
}));

export const homeSections = pgTable("home_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  type: homeSectionType("type").notNull(),
  title: text("title"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
}, (t) => ({
  siteIdx: index("home_sections_site_idx").on(t.siteId),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type CustomizationField = typeof customizationFields.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type HomeSection = typeof homeSections.$inferSelect;
