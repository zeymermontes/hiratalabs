/**
 * Herramientas que expone el servidor MCP. Todas están acotadas al sitio del
 * token: ninguna consulta sale sin `site_id = ctx.siteId`. Dinero en MXN con
 * decimales hacia afuera, centavos hacia adentro.
 *
 * Las descripciones van en español e inglés porque quien las lee es la IA del
 * dueño, que puede estar configurada en cualquiera de los dos.
 */
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { sites, submissions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { enabledModuleKeys } from "@/lib/modules";
import { categories, productCategories, productVariants, products } from "@/modules/catalog/schema";
import { orderItems, orderStatusHistory, orders } from "@/modules/orders/schema";
import { zodToJsonSchema, type JsonSchema } from "./json-schema";
import type { McpScope } from "./schema";

export type ToolContext = {
  siteId: string;
  tokenId: string;
  tokenName: string;
  scopes: McpScope[];
};

export type ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  scope: McpScope;
  schema: S;
  run: (ctx: ToolContext, args: z.infer<S>) => Promise<unknown>;
};

export class ToolError extends Error {
  constructor(message: string, public readonly code: "not_found" | "forbidden" | "invalid" | "conflict" = "invalid") {
    super(message);
    this.name = "ToolError";
  }
}

/* --------------------------------- helpers --------------------------------- */

const mxn = (cents: number | null | undefined) => Math.round(cents ?? 0) / 100;
const toCents = (mxnAmount: number) => Math.round(mxnAmount * 100);
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

const ORDER_STATUSES = ["pending", "paid", "in_production", "ready", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];
/** Pedidos que cuentan como venta para los resúmenes. */
const SOLD_STATUSES: OrderStatus[] = ["paid", "in_production", "ready", "shipped", "delivered"];

const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

const uuid = z.string().uuid();
const limit = (max: number, dflt: number) => z.number().int().min(1).max(max).default(dflt).describe(`Máximo ${max} / max ${max}`);
const dateStr = z.string().min(4).max(40).describe("Fecha ISO 8601, p. ej. 2025-01-31 / ISO 8601 date");

function parseDate(v: string | undefined, endOfDay = false): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ToolError(`Fecha inválida: ${v}`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(v)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80) || "producto";
}

async function uniqueSlug(siteId: string, base: string, excludeId?: string): Promise<string> {
  const rows = await db.select({ slug: products.slug, id: products.id }).from(products)
    .where(and(eq(products.siteId, siteId), ilike(products.slug, `${base}%`)));
  const taken = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

function productOut(p: typeof products.$inferSelect) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price_mxn: mxn(p.priceCents),
    compare_at_mxn: p.compareAtCents === null ? null : mxn(p.compareAtCents),
    status: p.status,
    stock: p.stock,
    sku: p.sku,
    featured: p.featured,
    images: (p.images ?? []).map((i) => i.url),
    created_at: iso(p.createdAt),
    updated_at: iso(p.updatedAt),
  };
}

async function loadProduct(siteId: string, ref: { id?: string; slug?: string }) {
  if (!ref.id && !ref.slug) throw new ToolError("Indica id o slug / provide id or slug");
  const [p] = await db.select().from(products).where(and(
    eq(products.siteId, siteId),
    ref.id ? eq(products.id, ref.id) : eq(products.slug, ref.slug!),
  ));
  if (!p) throw new ToolError("Producto no encontrado / product not found", "not_found");
  return p;
}

async function categoriesOf(siteId: string, productId: string) {
  return db.select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(and(eq(productCategories.productId, productId), eq(categories.siteId, siteId)));
}

function orderOut(o: typeof orders.$inferSelect) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    customer_name: o.fullName,
    customer_email: o.email,
    total_mxn: mxn(o.totalCents),
    created_at: iso(o.createdAt),
    paid_at: iso(o.paidAt),
  };
}

async function loadOrder(siteId: string, ref: { id?: string; number?: string | number }) {
  if (!ref.id && ref.number === undefined) throw new ToolError("Indica id o number / provide id or number");
  const [o] = await db.select().from(orders).where(and(
    eq(orders.siteId, siteId),
    ref.id ? eq(orders.id, ref.id) : sql`${orders.number}::text = ${String(ref.number)}`,
  ));
  if (!o) throw new ToolError("Pedido no encontrado / order not found", "not_found");
  return o;
}

/* ---------------------------------- tools ---------------------------------- */

function tool<S extends z.ZodTypeAny>(def: ToolDef<S>): ToolDef<z.ZodTypeAny> {
  return def as unknown as ToolDef<z.ZodTypeAny>;
}

const productWriteFields = {
  name: z.string().min(1).max(200).describe("Nombre / name"),
  description: z.string().max(8000).optional().describe("Descripción en texto plano / plain-text description"),
  price_mxn: z.number().min(0).max(10_000_000).describe("Precio en pesos MXN con decimales / price in MXN"),
  compare_at_mxn: z.number().min(0).max(10_000_000).nullable().optional().describe("Precio tachado 'antes' / strikethrough price; null to clear"),
  status: z.enum(PRODUCT_STATUSES).optional().describe("draft | active | archived"),
  sku: z.string().max(80).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).nullable().optional().describe("null = sin control de inventario / no stock tracking"),
  featured: z.boolean().optional(),
  slug: z.string().min(1).max(80).optional().describe("Opcional; se genera del nombre / optional, derived from name"),
  category_ids: z.array(uuid).max(20).optional().describe("Reemplaza las categorías del producto / replaces product categories"),
};

export const TOOLS: ToolDef[] = [
  tool({
    name: "get_site_info",
    scope: "read",
    description: "Información básica de la tienda: nombre, dominio, tipo y módulos activos. / Basic store info: name, host, kind and enabled modules.",
    schema: z.object({}),
    run: async (ctx) => {
      const [site] = await db.select().from(sites).where(eq(sites.id, ctx.siteId));
      if (!site) throw new ToolError("Sitio no encontrado", "not_found");
      const modules = await enabledModuleKeys(site);
      return {
        name: site.name,
        host: siteHost(site.slug, env.rootDomain),
        kind: site.kind,
        status: site.status,
        currency: "MXN",
        modules: [...modules],
        token: { name: ctx.tokenName, scopes: ctx.scopes },
      };
    },
  }),

  tool({
    name: "list_products",
    scope: "read",
    description: "Lista productos de la tienda con filtro por texto y estado. / List store products, optionally filtered by text and status.",
    schema: z.object({
      q: z.string().max(120).optional().describe("Busca en nombre y SKU / search in name and SKU"),
      status: z.enum(PRODUCT_STATUSES).optional(),
      limit: limit(50, 20),
    }),
    run: async (ctx, a) => {
      const where = [eq(products.siteId, ctx.siteId)];
      if (a.status) where.push(eq(products.status, a.status));
      if (a.q) where.push(or(ilike(products.name, `%${a.q}%`), ilike(products.sku, `%${a.q}%`))!);
      const rows = await db.select().from(products).where(and(...where))
        .orderBy(desc(products.updatedAt)).limit(a.limit);
      return { products: rows.map(productOut), count: rows.length };
    },
  }),

  tool({
    name: "get_product",
    scope: "read",
    description: "Un producto con sus variantes y categorías, por id o slug. / One product with variants and categories, by id or slug.",
    schema: z.object({ id: uuid.optional(), slug: z.string().max(120).optional() }),
    run: async (ctx, a) => {
      const p = await loadProduct(ctx.siteId, a);
      const [variants, cats] = await Promise.all([
        db.select().from(productVariants).where(eq(productVariants.productId, p.id)).orderBy(productVariants.sortOrder),
        categoriesOf(ctx.siteId, p.id),
      ]);
      return {
        ...productOut(p),
        variants: variants.map((v) => ({
          id: v.id, name: v.name, sku: v.sku, stock: v.stock,
          price_mxn: mxn(p.priceCents + v.priceDeltaCents),
        })),
        categories: cats,
      };
    },
  }),

  tool({
    name: "create_product",
    scope: "write",
    description: "Crea un producto (por default en borrador, no visible hasta activarlo). / Create a product (draft by default, hidden until activated).",
    schema: z.object(productWriteFields),
    run: async (ctx, a) => {
      const slug = await uniqueSlug(ctx.siteId, slugify(a.slug ?? a.name));
      if (a.category_ids?.length) await assertCategories(ctx.siteId, a.category_ids);
      const [p] = await db.insert(products).values({
        siteId: ctx.siteId,
        slug,
        name: a.name.trim(),
        description: a.description?.trim() || null,
        priceCents: toCents(a.price_mxn),
        compareAtCents: a.compare_at_mxn == null ? null : toCents(a.compare_at_mxn),
        status: a.status ?? "draft",
        sku: a.sku ?? null,
        stock: a.stock ?? null,
        featured: a.featured ?? false,
      }).returning();
      if (a.category_ids?.length) {
        await db.insert(productCategories).values(a.category_ids.map((categoryId) => ({ productId: p.id, categoryId })));
      }
      return productOut(p);
    },
  }),

  tool({
    name: "update_product",
    scope: "write",
    description: "Actualiza campos de un producto; solo cambia lo que mandes. / Partially update a product; only provided fields change.",
    schema: z.object({ id: uuid }).merge(z.object(productWriteFields).partial()),
    run: async (ctx, a) => {
      const p = await loadProduct(ctx.siteId, { id: a.id });
      const set: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
      if (a.name !== undefined) set.name = a.name.trim();
      if (a.description !== undefined) set.description = a.description.trim() || null;
      if (a.price_mxn !== undefined) set.priceCents = toCents(a.price_mxn);
      if (a.compare_at_mxn !== undefined) set.compareAtCents = a.compare_at_mxn === null ? null : toCents(a.compare_at_mxn);
      if (a.status !== undefined) set.status = a.status;
      if (a.sku !== undefined) set.sku = a.sku;
      if (a.stock !== undefined) set.stock = a.stock;
      if (a.featured !== undefined) set.featured = a.featured;
      if (a.slug !== undefined) set.slug = await uniqueSlug(ctx.siteId, slugify(a.slug), p.id);
      if (a.category_ids !== undefined) await assertCategories(ctx.siteId, a.category_ids);

      const [updated] = await db.update(products).set(set)
        .where(and(eq(products.id, p.id), eq(products.siteId, ctx.siteId))).returning();
      if (a.category_ids !== undefined) {
        await db.delete(productCategories).where(eq(productCategories.productId, p.id));
        if (a.category_ids.length) {
          await db.insert(productCategories).values(a.category_ids.map((categoryId) => ({ productId: p.id, categoryId })));
        }
      }
      return productOut(updated);
    },
  }),

  tool({
    name: "list_categories",
    scope: "read",
    description: "Categorías de la tienda con el número de productos en cada una. / Store categories with product counts.",
    schema: z.object({}),
    run: async (ctx) => {
      const rows = await db
        .select({
          id: categories.id, slug: categories.slug, name: categories.name, description: categories.description,
          parent_id: categories.parentId, show_in_header: categories.showInHeader,
          product_count: sql<number>`(select count(*) from ${productCategories} pc where pc.category_id = ${categories.id})::int`,
        })
        .from(categories)
        .where(eq(categories.siteId, ctx.siteId))
        .orderBy(categories.sortOrder, categories.name);
      return { categories: rows };
    },
  }),

  tool({
    name: "list_orders",
    scope: "read",
    description: "Pedidos de la tienda, más recientes primero, con filtro por estado y fechas. / Store orders, newest first, filterable by status and date range.",
    schema: z.object({
      status: z.enum(ORDER_STATUSES).optional(),
      from: dateStr.optional(),
      to: dateStr.optional(),
      limit: limit(50, 20),
    }),
    run: async (ctx, a) => {
      const where = [eq(orders.siteId, ctx.siteId)];
      if (a.status) where.push(eq(orders.status, a.status));
      const from = parseDate(a.from);
      const to = parseDate(a.to, true);
      if (from) where.push(gte(orders.createdAt, from));
      if (to) where.push(lte(orders.createdAt, to));
      const rows = await db.select().from(orders).where(and(...where)).orderBy(desc(orders.createdAt)).limit(a.limit);
      return { orders: rows.map(orderOut), count: rows.length };
    },
  }),

  tool({
    name: "get_order",
    scope: "read",
    description: "Un pedido con sus artículos e historial de estado, por id o número. / One order with items and status history, by id or number.",
    schema: z.object({ id: uuid.optional(), number: z.union([z.string().max(40), z.number().int()]).optional() }),
    run: async (ctx, a) => {
      const o = await loadOrder(ctx.siteId, a);
      const [items, history] = await Promise.all([
        db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
        db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id)).orderBy(orderStatusHistory.createdAt),
      ]);
      return {
        ...orderOut(o),
        items: items.map((i) => ({
          product_name: i.productName, variant_name: i.variantName, quantity: i.quantity,
          unit_price_mxn: mxn(i.unitPriceCents), line_total_mxn: mxn(i.unitPriceCents * i.quantity),
        })),
        history: history.map((h) => ({
          from: h.fromStatus, to: h.toStatus, note: h.note, changed_by: h.changedBy, at: iso(h.createdAt),
        })),
      };
    },
  }),

  tool({
    name: "update_order_status",
    scope: "write",
    description: "Cambia el estado de un pedido y deja nota en el historial. Estados: pending, paid, in_production, ready, shipped, delivered, cancelled. / Change an order's status and append a history note.",
    schema: z.object({
      id: uuid,
      status: z.enum(ORDER_STATUSES),
      note: z.string().max(500).optional().describe("Nota para el historial / history note"),
    }),
    run: async (ctx, a) => {
      const o = await loadOrder(ctx.siteId, { id: a.id });
      if (o.status === a.status) return { ...orderOut(o), changed: false };
      const [updated] = await db.update(orders).set({ status: a.status })
        .where(and(eq(orders.id, o.id), eq(orders.siteId, ctx.siteId))).returning();
      await db.insert(orderStatusHistory).values({
        orderId: o.id,
        fromStatus: o.status,
        toStatus: a.status,
        note: a.note?.trim() || null,
        changedBy: `mcp:${ctx.tokenName}`,
      });
      return { ...orderOut(updated), changed: true };
    },
  }),

  tool({
    name: "sales_summary",
    scope: "read",
    description: "Resumen de ventas de un periodo: pedidos, ingresos, ticket promedio y productos más vendidos. Solo cuenta pedidos pagados o posteriores. / Sales summary for a period: orders, revenue, average ticket and top products (paid orders and later statuses only).",
    schema: z.object({
      period: z.enum(["today", "7d", "30d", "this_month", "last_month", "this_year", "custom"]).default("30d"),
      from: dateStr.optional().describe("Solo con period = custom"),
      to: dateStr.optional().describe("Solo con period = custom"),
      top: z.number().int().min(1).max(20).default(5).describe("Cuántos productos top / how many top products"),
    }),
    run: async (ctx, a) => {
      const now = new Date();
      let from: Date;
      let to: Date = now;
      const startOfDay = (d: Date) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };
      switch (a.period) {
        case "today": from = startOfDay(now); break;
        case "7d": from = new Date(now.getTime() - 7 * 86_400_000); break;
        case "30d": from = new Date(now.getTime() - 30 * 86_400_000); break;
        case "this_month": from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); break;
        case "last_month":
          from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
          to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 1);
          break;
        case "this_year": from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); break;
        case "custom":
        default:
          from = parseDate(a.from) ?? new Date(now.getTime() - 30 * 86_400_000);
          to = parseDate(a.to, true) ?? now;
          break;
      }
      const sold = and(
        eq(orders.siteId, ctx.siteId),
        inArray(orders.status, SOLD_STATUSES),
        gte(orders.createdAt, from),
        lte(orders.createdAt, to),
      );
      const [[totals], top, byStatus] = await Promise.all([
        db.select({
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${orders.totalCents}), 0)::bigint`,
        }).from(orders).where(sold),
        db.select({
          product_name: orderItems.productName,
          units: sql<number>`sum(${orderItems.quantity})::int`,
          revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPriceCents})::bigint`,
        }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(sold)
          .groupBy(orderItems.productName).orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(a.top),
        db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders)
          .where(and(eq(orders.siteId, ctx.siteId), gte(orders.createdAt, from), lte(orders.createdAt, to)))
          .groupBy(orders.status),
      ]);
      const count = totals?.count ?? 0;
      const revenueCents = Number(totals?.revenue ?? 0);
      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        orders: count,
        revenue_mxn: mxn(revenueCents),
        average_ticket_mxn: count ? mxn(revenueCents / count) : 0,
        by_status: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
        top_products: top.map((t) => ({ product_name: t.product_name, units: t.units, revenue_mxn: mxn(Number(t.revenue)) })),
      };
    },
  }),

  tool({
    name: "list_submissions",
    scope: "read",
    description: "Mensajes recibidos por el formulario de contacto. / Contact-form messages received by the site.",
    schema: z.object({
      unread_only: z.boolean().default(false),
      limit: limit(50, 20),
    }),
    run: async (ctx, a) => {
      const where = [eq(submissions.siteId, ctx.siteId)];
      if (a.unread_only) where.push(isNull(submissions.readAt));
      const rows = await db.select({
        id: submissions.id, form: submissions.formName, name: submissions.name, email: submissions.email,
        phone: submissions.phone, message: submissions.message, created_at: submissions.createdAt, read_at: submissions.readAt,
      }).from(submissions).where(and(...where)).orderBy(desc(submissions.createdAt)).limit(a.limit);
      return {
        submissions: rows.map((r) => ({ ...r, created_at: iso(r.created_at), read_at: iso(r.read_at) })),
        count: rows.length,
      };
    },
  }),

  tool({
    name: "mark_submission_read",
    scope: "write",
    description: "Marca un mensaje de contacto como leído. / Mark a contact message as read.",
    schema: z.object({ id: uuid }),
    run: async (ctx, a) => {
      const [row] = await db.update(submissions).set({ readAt: new Date() })
        .where(and(eq(submissions.id, a.id), eq(submissions.siteId, ctx.siteId), isNull(submissions.readAt)))
        .returning({ id: submissions.id, read_at: submissions.readAt });
      if (!row) {
        const [exists] = await db.select({ id: submissions.id }).from(submissions)
          .where(and(eq(submissions.id, a.id), eq(submissions.siteId, ctx.siteId)));
        if (!exists) throw new ToolError("Mensaje no encontrado / message not found", "not_found");
        return { id: a.id, already_read: true };
      }
      return { id: row.id, read_at: iso(row.read_at) };
    },
  }),
];

async function assertCategories(siteId: string, ids: string[]) {
  if (ids.length === 0) return;
  const rows = await db.select({ id: categories.id }).from(categories)
    .where(and(eq(categories.siteId, siteId), inArray(categories.id, ids)));
  if (rows.length !== new Set(ids).size) throw new ToolError("Alguna categoría no existe en esta tienda / unknown category id");
}

export const TOOL_BY_NAME: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

/** Lo que responde tools/list, filtrado a lo que el token puede usar. */
export function listToolsFor(scopes: McpScope[]): { name: string; description: string; inputSchema: JsonSchema }[] {
  return TOOLS
    .filter((t) => scopes.includes(t.scope))
    .map((t) => ({ name: t.name, description: t.description, inputSchema: zodToJsonSchema(t.schema) }));
}
