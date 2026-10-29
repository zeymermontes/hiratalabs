"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { addresses, cartItems, orderItems, orders, productVariants, products, type AddressSnapshot } from "@/lib/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { clearCart, getCart } from "./cart";
import { getCustomerSession } from "./customers";
import { nextOrderNumber, recordStatusChange } from "./orders";
import { storeFromHeaders } from "./request";
import { computeShipping } from "./shipping";
import { getShippingConfig } from "./shipping-server";

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

const AddressFields = z.object({
  recipient: z.string().trim().min(2, "Escribe quién recibe el paquete."),
  street: z.string().trim().min(2, "Escribe la calle."),
  extNumber: z.string().trim().max(20).optional(),
  intNumber: z.string().trim().max(20).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, "Escribe la ciudad."),
  state: z.string().trim().min(1, "Elige el estado."),
  zip: z.string().trim().regex(/^\d{5}$/, "El código postal lleva 5 dígitos."),
  addressPhone: z.string().trim().max(30).optional(),
});

const CheckoutSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL, "Escribe un correo válido."),
  fullName: z.string().trim().min(2, "Escribe tu nombre."),
  phone: z.string().trim().min(8, "Escribe un teléfono donde te podamos contactar.").max(30),
  fulfillment: z.enum(["ship", "pickup"]),
  /** Dirección guardada (cliente con sesión) o "new". */
  addressId: z.string().optional(),
  saveAddress: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});

export type CheckoutState = {
  errors?: Record<string, string | undefined>;
  message?: string;
};

function str(form: FormData, k: string) {
  const v = form.get(k);
  return typeof v === "string" ? v : undefined;
}

/**
 * Crea el pedido a partir del carrito: recalcula precios desde el catálogo,
 * valida existencias, descuenta inventario, asigna folio y deja el pedido en
 * "pendiente de pago". Luego manda al cliente a pagar.
 */
export async function createOrder(_prev: CheckoutState | undefined, form: FormData): Promise<CheckoutState> {
  const ctx = await storeFromHeaders();
  if (!ctx || !ctx.modules.has("orders")) return { message: "Esta tienda no acepta pedidos por ahora." };
  if (ctx.site.status !== "live") return { message: "La tienda no está disponible en este momento." };
  const siteId = ctx.site.id;

  const parsed = CheckoutSchema.safeParse({
    email: str(form, "email"), fullName: str(form, "fullName"), phone: str(form, "phone"),
    fulfillment: str(form, "fulfillment"), addressId: str(form, "addressId") || undefined,
    saveAddress: form.get("saveAddress") === "on", notes: str(form, "notes") || undefined,
  });
  if (!parsed.success) return { errors: firstErrors(parsed.error) };
  const data = parsed.data;

  const shippingCfg = await getShippingConfig(siteId);
  if (data.fulfillment === "pickup" && !shippingCfg.pickupEnabled) {
    return { message: "Esta tienda no ofrece recoger en tienda. Elige envío a domicilio." };
  }

  const session = ctx.modules.has("customers") ? await getCustomerSession(siteId) : null;
  const limit = rateLimit(`checkout:${session?.customer.id ?? data.email}`, 10, 10 * 60_000);
  if (!limit.ok) return { message: "Demasiados intentos. Espera un momento y vuelve a intentar." };

  /* --------------------------- dirección --------------------------- */
  let snapshot: AddressSnapshot | null = null;
  let newAddress: z.infer<typeof AddressFields> | null = null;
  if (data.fulfillment === "ship") {
    if (session && data.addressId && data.addressId !== "new") {
      const [a] = await db.select().from(addresses).where(and(
        eq(addresses.id, data.addressId), eq(addresses.siteId, siteId), eq(addresses.customerId, session.customer.id),
      ));
      if (!a) return { message: "Esa dirección ya no existe. Elige otra." };
      snapshot = {
        label: a.label, recipient: a.recipient, street: a.street, extNumber: a.extNumber, intNumber: a.intNumber,
        neighborhood: a.neighborhood, city: a.city, state: a.state, zip: a.zip, phone: a.phone,
      };
    } else {
      const addr = AddressFields.safeParse({
        recipient: str(form, "recipient") || data.fullName, street: str(form, "street"), extNumber: str(form, "extNumber"),
        intNumber: str(form, "intNumber"), neighborhood: str(form, "neighborhood"), city: str(form, "city"),
        state: str(form, "state"), zip: str(form, "zip"), addressPhone: str(form, "addressPhone"),
      });
      if (!addr.success) return { errors: firstErrors(addr.error) };
      newAddress = addr.data;
      snapshot = {
        label: "Casa", recipient: addr.data.recipient, street: addr.data.street, extNumber: addr.data.extNumber || null,
        intNumber: addr.data.intNumber || null, neighborhood: addr.data.neighborhood || null, city: addr.data.city,
        state: addr.data.state, zip: addr.data.zip, phone: addr.data.addressPhone || data.phone,
      };
    }
  }

  /* ----------------------------- carrito ----------------------------- */
  const cart = await getCart(siteId);
  const items = cart.items.filter((i) => !i.unavailable);
  if (!cart.cartId || items.length === 0) return { message: "Tu carrito está vacío." };
  for (const i of items) {
    if (i.available !== null && i.quantity > i.available) {
      return { message: i.available === 0 ? `"${i.name}" se agotó. Quítalo del carrito para continuar.` : `Solo quedan ${i.available} de "${i.name}". Ajusta la cantidad.` };
    }
  }

  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const shippingCents = computeShipping(shippingCfg, subtotalCents, data.fulfillment);
  const totalCents = subtotalCents + shippingCents;
  const cartId = cart.cartId;

  /* ----------------------------- pedido ----------------------------- */
  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      // Descuento de inventario con verificación en la misma sentencia: si no
      // alcanza, no se toca nada y se avisa.
      for (const i of items) {
        if (i.variantId) {
          const r = await tx.update(productVariants)
            .set({ stock: sql`${productVariants.stock} - ${i.quantity}` })
            .where(and(eq(productVariants.id, i.variantId), sql`${productVariants.stock} is not null`, sql`${productVariants.stock} >= ${i.quantity}`))
            .returning({ id: productVariants.id });
          const [v] = await tx.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, i.variantId));
          if (v && v.stock !== null && r.length === 0) throw new Error(`STOCK:${i.name}`);
          if (v && v.stock !== null) continue; // la variante controla el inventario
        }
        const r = await tx.update(products)
          .set({ stock: sql`${products.stock} - ${i.quantity}` })
          .where(and(eq(products.id, i.productId), sql`${products.stock} is not null`, sql`${products.stock} >= ${i.quantity}`))
          .returning({ id: products.id });
        const [p] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, i.productId));
        if (p && p.stock !== null && r.length === 0) throw new Error(`STOCK:${i.name}`);
      }

      const number = await nextOrderNumber(tx, siteId);
      const [order] = await tx.insert(orders).values({
        siteId, number,
        customerId: session?.customer.id ?? null,
        email: data.email, fullName: data.fullName, phone: data.phone,
        status: "pending",
        subtotalCents, discountCents: 0, shippingCents, totalCents,
        fulfillment: data.fulfillment,
        addressSnapshot: snapshot,
        paymentProvider: "mercadopago",
        notes: data.notes || null,
      }).returning({ id: orders.id });

      await tx.insert(orderItems).values(items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        productName: i.name,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        customization: i.customization,
        uploadedFileUrl: i.uploadedFileUrl,
        meta: { variantId: i.variantId },
      })));
      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      return order.id;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("STOCK:")) return { message: `Ya no hay suficientes existencias de "${msg.slice(6)}". Ajusta la cantidad en tu carrito.` };
    console.error("[checkout] createOrder failed:", e);
    return { message: "No pudimos registrar tu pedido. Intenta de nuevo." };
  }

  await recordStatusChange(orderId, null, "pending", "checkout");
  await clearCart(cartId).catch(() => null);

  if (session && newAddress && data.saveAddress) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(addresses).where(eq(addresses.customerId, session.customer.id));
    await db.insert(addresses).values({
      siteId, customerId: session.customer.id, label: "Casa", recipient: newAddress.recipient, street: newAddress.street,
      extNumber: newAddress.extNumber || null, intNumber: newAddress.intNumber || null, neighborhood: newAddress.neighborhood || null,
      city: newAddress.city, state: newAddress.state, zip: newAddress.zip, phone: newAddress.addressPhone || data.phone, isDefault: n === 0,
    }).catch(() => null);
  }

  const { sendOrderReceived } = await import("./emails");
  sendOrderReceived(siteId, orderId).catch((e) => console.error("[checkout] received email failed:", e));

  redirect(`/checkout/pagar/${orderId}`);
}

function firstErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
