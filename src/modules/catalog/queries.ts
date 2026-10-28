/**
 * Consultas del catálogo. Todas filtran por site_id: un producto nunca se
 * resuelve sin saber de qué tienda es. Se usan desde el storefront y desde el
 * panel; la autorización la hace quien llama (requireSiteAccess o el host).
 */
import { and, asc, count, desc, eq, ilike, inArray, isNull, lte, gte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  banners, categories, customizationFields, productCategories, products, productVariants,
  type Banner, type Category, type CustomizationField, type HomeSection, type Product, type ProductVariant,
  homeSections,
} from "@/modules/catalog/schema";

export type ProductStatus = Product["status"];
export type BannerPosition = Banner["position"];

export type ListProductsOpts = {
  /** Sin status = todos (panel). El storefront pasa "active". */
  status?: ProductStatus;
  categorySlug?: string;
  q?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export type ProductList = { items: Product[]; total: number; limit: number; offset: number };

export type CategoryNode = Category & { children: CategoryNode[] };

export type ProductDetail = {
  product: Product;
  variants: ProductVariant[];
  categories: Category[];
  fields: CustomizationField[];
};

/* ------------------------------------------------------------------ precios */

/** Precio final en centavos: base + delta de la variante (si hay). Nunca negativo. */
export function effectivePriceCents(
  product: Pick<Product, "priceCents">,
  variant?: Pick<ProductVariant, "priceDeltaCents"> | null,
): number {
  const total = product.priceCents + (variant?.priceDeltaCents ?? 0);
  return total < 0 ? 0 : total;
}

/** Precio "desde": el más bajo entre todas las variantes (o el base). */
export function minPriceCents(product: Pick<Product, "priceCents">, variants: Pick<ProductVariant, "priceDeltaCents">[]): number {
  if (variants.length === 0) return effectivePriceCents(product);
  return Math.min(...variants.map((v) => effectivePriceCents(product, v)));
}

/* --------------------------------------------------------------- categorías */

export function buildCategoryTree(all: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of all) byId.set(c.id, { ...c, children: [] });
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (list: CategoryNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"));
    for (const n of list) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

/** Ids de una categoría y de todas sus descendientes. */
export function descendantIds(rootId: string, all: Pick<Category, "id" | "parentId">[]): string[] {
  const out = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const c of all) {
      if (c.parentId === cur && !out.includes(c.id)) { out.push(c.id); queue.push(c.id); }
    }
  }
  return out;
}

export async function listCategories(siteId: string): Promise<{ all: Category[]; tree: CategoryNode[]; header: Category[] }> {
  const all = await db.select().from(categories)
    .where(eq(categories.siteId, siteId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  const tree = buildCategoryTree(all);
  const header = tree.filter((c) => c.showInHeader);
  return { all, tree, header };
}

export async function getCategoryBySlug(siteId: string, slug: string): Promise<Category | null> {
  const [row] = await db.select().from(categories)
    .where(and(eq(categories.siteId, siteId), eq(categories.slug, slug)));
  return row ?? null;
}

/* ---------------------------------------------------------------- productos */

export async function listProducts(siteId: string, opts: ListProductsOpts = {}): Promise<ProductList> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const where = [eq(products.siteId, siteId)];
  if (opts.status) where.push(eq(products.status, opts.status));
  if (opts.featured !== undefined) where.push(eq(products.featured, opts.featured));
  if (opts.q?.trim()) {
    const term = `%${opts.q.trim().replace(/[%_]/g, "")}%`;
    where.push(or(ilike(products.name, term), ilike(products.sku, term), ilike(products.description, term))!);
  }
  if (opts.categorySlug) {
    const cat = await getCategoryBySlug(siteId, opts.categorySlug);
    if (!cat) return { items: [], total: 0, limit, offset };
    const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories)
      .where(eq(categories.siteId, siteId));
    const ids = descendantIds(cat.id, all);
    const links = await db.select({ productId: productCategories.productId }).from(productCategories)
      .where(inArray(productCategories.categoryId, ids));
    const productIds = [...new Set(links.map((l) => l.productId))];
    if (productIds.length === 0) return { items: [], total: 0, limit, offset };
    where.push(inArray(products.id, productIds));
  }

  const cond = and(...where);
  const [items, [{ total }]] = await Promise.all([
    db.select().from(products).where(cond)
      .orderBy(desc(products.featured), asc(products.sortOrder), desc(products.createdAt))
      .limit(limit).offset(offset),
    db.select({ total: count() }).from(products).where(cond),
  ]);
  return { items, total: Number(total), limit, offset };
}

async function hydrate(product: Product): Promise<ProductDetail> {
  const [variants, links, fields] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.sortOrder)),
    db.select({ category: categories }).from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(and(eq(productCategories.productId, product.id), eq(categories.siteId, product.siteId))),
    db.select().from(customizationFields).where(eq(customizationFields.productId, product.id)).orderBy(asc(customizationFields.sortOrder)),
  ]);
  return { product, variants, categories: links.map((l) => l.category), fields };
}

/** Producto con variantes, categorías y campos. Solo activos salvo que se pida otro status. */
export async function getProductBySlug(siteId: string, slug: string, opts: { status?: ProductStatus | "any" } = {}): Promise<ProductDetail | null> {
  const status = opts.status ?? "active";
  const where = [eq(products.siteId, siteId), eq(products.slug, slug)];
  if (status !== "any") where.push(eq(products.status, status));
  const [product] = await db.select().from(products).where(and(...where));
  if (!product) return null;
  return hydrate(product);
}

/** Para el panel: por id, cualquier status. */
export async function getProductById(siteId: string, id: string): Promise<ProductDetail | null> {
  const [product] = await db.select().from(products).where(and(eq(products.siteId, siteId), eq(products.id, id)));
  if (!product) return null;
  return hydrate(product);
}

/** Categorías asignadas a varios productos de un jalón (listado del panel). */
export async function categoriesForProducts(siteId: string, productIds: string[]): Promise<Map<string, Category[]>> {
  const out = new Map<string, Category[]>();
  if (productIds.length === 0) return out;
  const rows = await db.select({ productId: productCategories.productId, category: categories }).from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(and(inArray(productCategories.productId, productIds), eq(categories.siteId, siteId)));
  for (const r of rows) {
    if (!out.has(r.productId)) out.set(r.productId, []);
    out.get(r.productId)!.push(r.category);
  }
  return out;
}

/** Conteo por status para el encabezado del panel. */
export async function productCounts(siteId: string): Promise<Record<ProductStatus | "all", number>> {
  const rows = await db.select({ status: products.status, n: count() }).from(products)
    .where(eq(products.siteId, siteId)).groupBy(products.status);
  const out: Record<ProductStatus | "all", number> = { all: 0, draft: 0, active: 0, archived: 0 };
  for (const r of rows) { out[r.status] = Number(r.n); out.all += Number(r.n); }
  return out;
}

/* ------------------------------------------------------------------ portada */

/** Banners activos y vigentes de una posición, en orden. */
export async function listBanners(siteId: string, position?: BannerPosition, opts: { includeInactive?: boolean } = {}): Promise<Banner[]> {
  const where = [eq(banners.siteId, siteId)];
  if (position) where.push(eq(banners.position, position));
  if (!opts.includeInactive) {
    const now = new Date();
    where.push(eq(banners.active, true));
    where.push(or(isNull(banners.startsAt), lte(banners.startsAt, now))!);
    where.push(or(isNull(banners.endsAt), gte(banners.endsAt, now))!);
  }
  return db.select().from(banners).where(and(...where)).orderBy(asc(banners.sortOrder), asc(banners.title));
}

export async function listHomeSections(siteId: string, opts: { includeInactive?: boolean } = {}): Promise<HomeSection[]> {
  const where = [eq(homeSections.siteId, siteId)];
  if (!opts.includeInactive) where.push(eq(homeSections.active, true));
  return db.select().from(homeSections).where(and(...where)).orderBy(asc(homeSections.sortOrder));
}

/** Cuántos productos tiene cada categoría (panel). */
export async function categoryProductCounts(siteId: string): Promise<Record<string, number>> {
  const rows = await db.select({ categoryId: productCategories.categoryId, n: count() }).from(productCategories)
    .innerJoin(categories, eq(categories.id, productCategories.categoryId))
    .where(eq(categories.siteId, siteId))
    .groupBy(productCategories.categoryId);
  return Object.fromEntries(rows.map((r) => [r.categoryId, Number(r.n)]));
}
