import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  cartItems, carts, customizationFields, productVariants, products,
  type Cart, type CustomizationField, type Product, type ProductVariant,
} from "@/lib/db/schema";
import { getCustomerSession } from "./customers";

/** Cookie con el id de visitante. El carrito de un cliente con sesión vive por customer_id. */
const CART_COOKIE = "sf_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;
export const MAX_QTY = 99;

async function guestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value || null;
}

/** Crea la cookie si no existe. Solo funciona en route handlers y server actions. */
async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    store.set(CART_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: CART_COOKIE_MAX_AGE, secure: process.env.NODE_ENV === "production" });
  } catch {
    // Server Component: no se pueden escribir cookies. El carrito se crea al agregar.
  }
  return id;
}

async function clearGuestCookie() {
  try {
    const store = await cookies();
    store.delete(CART_COOKIE);
  } catch { /* Server Component */ }
}

/** El carrito del visitante o cliente actual, sin crearlo. */
export async function findCart(siteId: string): Promise<Cart | null> {
  const session = await getCustomerSession(siteId);
  if (session) {
    const [c] = await db.select().from(carts).where(and(eq(carts.siteId, siteId), eq(carts.customerId, session.customer.id)));
    return c ?? null;
  }
  const gid = await guestId();
  if (!gid) return null;
  const [c] = await db.select().from(carts).where(and(eq(carts.siteId, siteId), eq(carts.guestId, gid)));
  return c ?? null;
}

export async function getOrCreateCart(siteId: string): Promise<Cart> {
  const existing = await findCart(siteId);
  if (existing) return existing;
  const session = await getCustomerSession(siteId);
  if (session) {
    const [c] = await db.insert(carts).values({ siteId, customerId: session.customer.id })
      .onConflictDoNothing().returning();
    if (c) return c;
    const [again] = await db.select().from(carts).where(and(eq(carts.siteId, siteId), eq(carts.customerId, session.customer.id)));
    return again;
  }
  const gid = await ensureGuestId();
  const [c] = await db.insert(carts).values({ siteId, guestId: gid }).onConflictDoNothing().returning();
  if (c) return c;
  const [again] = await db.select().from(carts).where(and(eq(carts.siteId, siteId), eq(carts.guestId, gid)));
  return again;
}

/* ------------------------------- precios ------------------------------- */

/**
 * Precio unitario vigente: base del producto + diferencia de la variante +
 * diferencia de las opciones de personalización tipo lista (si las hay).
 */
export function unitPriceFor(
  product: Pick<Product, "priceCents">,
  variant: Pick<ProductVariant, "priceDeltaCents"> | null,
  customization: Record<string, unknown> | null | undefined,
  fields: Pick<CustomizationField, "name" | "type" | "options">[],
): number {
  let cents = product.priceCents + (variant?.priceDeltaCents ?? 0);
  if (customization && fields.length) {
    for (const f of fields) {
      if (f.type !== "dropdown" || !f.options) continue;
      const chosen = customization[f.name];
      if (typeof chosen !== "string") continue;
      const opt = f.options.find((o) => o.value === chosen);
      if (opt?.priceDeltaCents) cents += opt.priceDeltaCents;
    }
  }
  return Math.max(0, cents);
}

/** Existencia disponible: la de la variante si la controla, si no la del producto; null = sin control. */
export function availableStock(product: Pick<Product, "stock">, variant: Pick<ProductVariant, "stock"> | null): number | null {
  if (variant && variant.stock !== null) return variant.stock;
  return product.stock;
}

/* ------------------------------- lectura ------------------------------- */

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  customization: Record<string, unknown> | null;
  uploadedFileUrl: string | null;
  /** null = sin control de inventario. */
  available: number | null;
  /** El producto ya no está activo o no existe: se muestra pero no se puede comprar. */
  unavailable: boolean;
};

export type CartView = {
  cartId: string | null;
  items: CartLine[];
  subtotalCents: number;
  /** Artículos sumando cantidades. */
  count: number;
};

const EMPTY: CartView = { cartId: null, items: [], subtotalCents: 0, count: 0 };

/** Carrito con productos, precios recalculados del catálogo y totales. */
export async function getCart(siteId: string): Promise<CartView> {
  const cart = await findCart(siteId);
  if (!cart) return EMPTY;
  return readCart(siteId, cart.id);
}

export async function readCart(siteId: string, cartId: string): Promise<CartView> {
  const rows = await db.select({
    item: cartItems, product: products, variant: productVariants,
  }).from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.createdAt);

  const customizedIds = [...new Set(rows.filter((r) => r.item.customization).map((r) => r.product.id))];
  const fields = customizedIds.length
    ? await db.select().from(customizationFields).where(inArray(customizationFields.productId, customizedIds))
    : [];

  const items: CartLine[] = rows.map(({ item, product, variant }) => {
    const unavailable = product.siteId !== siteId || product.status !== "active";
    const unit = unitPriceFor(product, variant, item.customization, fields.filter((f) => f.productId === product.id));
    return {
      id: item.id,
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      slug: product.slug,
      variantName: variant?.name ?? null,
      imageUrl: product.images[0]?.thumbUrl ?? product.images[0]?.url ?? null,
      quantity: item.quantity,
      unitPriceCents: unit,
      lineTotalCents: unit * item.quantity,
      customization: item.customization ?? null,
      uploadedFileUrl: item.uploadedFileUrl,
      available: availableStock(product, variant),
      unavailable,
    };
  });
  const live = items.filter((i) => !i.unavailable);
  return {
    cartId,
    items,
    subtotalCents: live.reduce((s, i) => s + i.lineTotalCents, 0),
    count: live.reduce((s, i) => s + i.quantity, 0),
  };
}

/** Para el badge del header. */
export async function getCartCount(siteId: string): Promise<number> {
  const cart = await findCart(siteId);
  if (!cart) return 0;
  const [row] = await db.select({ n: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` })
    .from(cartItems).where(eq(cartItems.cartId, cart.id));
  return row?.n ?? 0;
}

/* ------------------------------ mutaciones ----------------------------- */

export type CartResult = { ok: true; count: number } | { ok: false; error: string };

export type AddItemInput = {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  customization?: Record<string, unknown> | null;
  uploadedFileUrl?: string | null;
};

function sameCustomization(a: Record<string, unknown> | null, b: Record<string, unknown> | null) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export async function addItem(siteId: string, input: AddItemInput): Promise<CartResult> {
  const quantity = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(input.quantity ?? 1)) || 1));

  const [product] = await db.select().from(products)
    .where(and(eq(products.id, input.productId), eq(products.siteId, siteId), eq(products.status, "active")));
  if (!product) return { ok: false, error: "Ese producto ya no está disponible." };

  let variant: ProductVariant | null = null;
  if (input.variantId) {
    const [v] = await db.select().from(productVariants)
      .where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, product.id)));
    if (!v) return { ok: false, error: "Elige una opción válida." };
    variant = v;
  }

  const customization = input.customization && typeof input.customization === "object" ? input.customization : null;
  // requiresFile no bloquea aquí: el catálogo pide el archivo después de
  // confirmar el pedido (la tienda lo recibe por correo / panel).
  const fields = customization
    ? await db.select().from(customizationFields).where(eq(customizationFields.productId, product.id))
    : [];
  if (product.isCustomizable && fields.length) {
    for (const f of fields) {
      if (!f.required || f.type === "file") continue;
      if (f.variantIds?.length && variant && !f.variantIds.includes(variant.id)) continue;
      const v = customization?.[f.name];
      if (v === undefined || v === null || v === "") return { ok: false, error: `Falta: ${f.label}.` };
    }
  }

  const cart = await getOrCreateCart(siteId);
  const existing = await db.select().from(cartItems).where(and(
    eq(cartItems.cartId, cart.id),
    eq(cartItems.productId, product.id),
    variant ? eq(cartItems.variantId, variant.id) : sql`${cartItems.variantId} is null`,
  ));
  const match = existing.find((i) => sameCustomization(i.customization ?? null, customization) && (i.uploadedFileUrl ?? null) === (input.uploadedFileUrl ?? null));

  const stock = availableStock(product, variant);
  const already = match ? match.quantity : 0;
  if (stock !== null && already + quantity > stock) {
    return { ok: false, error: stock === 0 ? "Se agotó este producto." : `Solo quedan ${stock} disponibles.` };
  }

  const unitPriceCents = unitPriceFor(product, variant, customization, fields);
  if (match) {
    await db.update(cartItems).set({ quantity: Math.min(MAX_QTY, already + quantity), unitPriceCents })
      .where(eq(cartItems.id, match.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id, productId: product.id, variantId: variant?.id ?? null, quantity,
      unitPriceCents, customization, uploadedFileUrl: input.uploadedFileUrl ?? null,
    });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return { ok: true, count: await getCartCount(siteId) };
}

/** Solo toca renglones del carrito actual de esta tienda. */
async function ownItem(siteId: string, itemId: string) {
  const cart = await findCart(siteId);
  if (!cart) return null;
  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
  return item ?? null;
}

export async function updateItemQty(siteId: string, itemId: string, quantity: number): Promise<CartResult> {
  const item = await ownItem(siteId, itemId);
  if (!item) return { ok: false, error: "Ese artículo ya no está en tu carrito." };
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1) return removeItem(siteId, itemId);

  const [product] = await db.select().from(products).where(eq(products.id, item.productId));
  const [variant] = item.variantId
    ? await db.select().from(productVariants).where(eq(productVariants.id, item.variantId))
    : [null];
  if (!product) return removeItem(siteId, itemId);
  const stock = availableStock(product, variant ?? null);
  if (stock !== null && qty > stock) {
    return { ok: false, error: stock === 0 ? "Se agotó este producto." : `Solo quedan ${stock} disponibles.` };
  }
  await db.update(cartItems).set({ quantity: Math.min(MAX_QTY, qty) }).where(eq(cartItems.id, item.id));
  return { ok: true, count: await getCartCount(siteId) };
}

export async function removeItem(siteId: string, itemId: string): Promise<CartResult> {
  const item = await ownItem(siteId, itemId);
  if (item) await db.delete(cartItems).where(eq(cartItems.id, item.id));
  return { ok: true, count: await getCartCount(siteId) };
}

/** Vacía el carrito (después de crear el pedido). */
export async function clearCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

/**
 * Al iniciar sesión: lo que el visitante tenía en su carrito pasa al carrito de
 * su cuenta (en esta tienda) y la cookie de visitante se borra.
 */
export async function mergeGuestCart(siteId: string, customerId: string) {
  const gid = await guestId();
  if (!gid) return;
  const [guestCart] = await db.select().from(carts).where(and(eq(carts.siteId, siteId), eq(carts.guestId, gid)));
  if (!guestCart) { await clearGuestCookie(); return; }

  const [userCart] = await db.select().from(carts).where(and(eq(carts.siteId, siteId), eq(carts.customerId, customerId)));
  if (!userCart) {
    await db.update(carts).set({ customerId, guestId: null, updatedAt: new Date() }).where(eq(carts.id, guestCart.id));
  } else {
    await db.update(cartItems).set({ cartId: userCart.id }).where(eq(cartItems.cartId, guestCart.id));
    await db.delete(carts).where(eq(carts.id, guestCart.id));
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, userCart.id));
  }
  await clearGuestCookie();
}
