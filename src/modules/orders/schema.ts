/**
 * Módulo pedidos: compradores, direcciones, carritos, pedidos y su historial.
 * Todo cuelga de sites.id (tenant) y toda consulta filtra por site_id. Dinero
 * en centavos MXN (integer). Un pedido guarda una copia de lo que compró el
 * cliente (nombre, precio, dirección) para que editar el catálogo después no
 * cambie lo que ya se vendió.
 *
 * Referencia products/product_variants del módulo catálogo (contrato compartido).
 */
import { sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { sites } from "@/lib/db/schema";
import { products, productVariants } from "@/modules/catalog/schema";

export const orderStatus = pgEnum("order_status", [
  "pending", "paid", "in_production", "ready", "shipped", "delivered", "cancelled",
]);
export const fulfillmentKind = pgEnum("fulfillment_kind", ["ship", "pickup"]);

export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type FulfillmentKind = (typeof fulfillmentKind.enumValues)[number];

/** Copia de la dirección al momento de comprar. */
export type AddressSnapshot = {
  label?: string | null;
  recipient: string;
  street: string;
  extNumber?: string | null;
  intNumber?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  zip: string;
  phone?: string | null;
};

/** Comprador con cuenta. Un usuario de Supabase puede ser cliente de varias tiendas: la fila es por (site_id, user_id). */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteUserIdx: uniqueIndex("customers_site_user_idx").on(t.siteId, t.userId),
  siteEmailIdx: uniqueIndex("customers_site_email_idx").on(t.siteId, t.email),
  siteIdx: index("customers_site_idx").on(t.siteId),
}));

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  recipient: text("recipient").notNull(),
  street: text("street").notNull(),
  extNumber: text("ext_number"),
  intNumber: text("int_number"),
  neighborhood: text("neighborhood"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  phone: text("phone"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("addresses_site_idx").on(t.siteId),
  customerIdx: index("addresses_customer_idx").on(t.customerId),
}));

/** Un carrito por cliente o por visitante (cookie sf_cart). */
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  guestId: text("guest_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("carts_site_idx").on(t.siteId),
  customerIdx: uniqueIndex("carts_site_customer_idx").on(t.siteId, t.customerId).where(sql`customer_id is not null`),
  guestIdx: uniqueIndex("carts_site_guest_idx").on(t.siteId, t.guestId).where(sql`guest_id is not null`),
}));

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  /** Precio al momento de agregar; se recalcula del catálogo al pagar. */
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  customization: jsonb("customization").$type<Record<string, unknown>>(),
  uploadedFileUrl: text("uploaded_file_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  cartIdx: index("cart_items_cart_idx").on(t.cartId),
}));

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  /** Folio consecutivo por tienda (1, 2, 3…). */
  number: integer("number").notNull(),
  /** null = compra como invitado. */
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  status: orderStatus("status").notNull().default("pending"),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  discountCents: integer("discount_cents").notNull().default(0),
  shippingCents: integer("shipping_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  fulfillment: fulfillmentKind("fulfillment").notNull().default("ship"),
  addressSnapshot: jsonb("address_snapshot").$type<AddressSnapshot>(),
  /** Sucursal elegida para recoger (módulo sucursales; sin FK todavía). */
  branchId: uuid("branch_id"),
  paymentProvider: text("payment_provider"),
  paymentId: text("payment_id"),
  paymentStatus: text("payment_status"),
  paymentStatusDetail: text("payment_status_detail"),
  notes: text("notes"),
  trackingCarrier: text("tracking_carrier"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => ({
  siteNumberIdx: uniqueIndex("orders_site_number_idx").on(t.siteId, t.number),
  siteCreatedIdx: index("orders_site_created_idx").on(t.siteId, t.createdAt),
  siteStatusIdx: index("orders_site_status_idx").on(t.siteId, t.status),
  customerIdx: index("orders_customer_idx").on(t.customerId),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  variantName: text("variant_name"),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  customization: jsonb("customization").$type<Record<string, unknown>>(),
  uploadedFileUrl: text("uploaded_file_url"),
  /** Datos libres por módulo (p. ej. el fotolibro guarda aquí sus pliegos). */
  meta: jsonb("meta").$type<Record<string, unknown>>(),
}, (t) => ({
  orderIdx: index("order_items_order_idx").on(t.orderId),
}));

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatus("from_status"),
  toStatus: orderStatus("to_status").notNull(),
  note: text("note"),
  /** Correo del admin, o "mercadopago" / "checkout" / "sistema". */
  changedBy: text("changed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("order_status_history_order_idx").on(t.orderId),
}));

export const orderEmailLog = pgTable("order_email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  /** received | paid | status_<estado> | merchant_new_order */
  kind: text("kind").notNull(),
  toEmail: text("to_email").notNull(),
  ok: boolean("ok").notNull().default(false),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("order_email_log_order_idx").on(t.orderId),
}));

export type Customer = typeof customers.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatusHistoryRow = typeof orderStatusHistory.$inferSelect;
export type OrderEmailLogRow = typeof orderEmailLog.$inferSelect;
