"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { getCustomerSession } from "./customers";
import { storeFromHeaders } from "./request";

const AddressSchema = z.object({
  label: z.string().trim().min(1, "Ponle un nombre (Casa, Oficina…).").max(40),
  recipient: z.string().trim().min(2, "¿Quién recibe?"),
  street: z.string().trim().min(2, "Escribe la calle."),
  extNumber: z.string().trim().max(20).optional(),
  intNumber: z.string().trim().max(20).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, "Escribe la ciudad."),
  state: z.string().trim().min(1, "Elige el estado."),
  zip: z.string().trim().regex(/^\d{5}$/, "El código postal lleva 5 dígitos."),
  phone: z.string().trim().max(30).optional(),
  isDefault: z.boolean(),
});

export type AddressState = { errors?: Record<string, string | undefined>; message?: string; ok?: boolean };

async function who() {
  const ctx = await storeFromHeaders();
  if (!ctx || !ctx.modules.has("customers")) return null;
  const session = await getCustomerSession(ctx.site.id);
  if (!session) redirect("/cuenta/login?next=%2Fmi-cuenta%2Fdirecciones");
  return { siteId: ctx.site.id, customerId: session.customer.id };
}

function parse(form: FormData) {
  const s = (k: string) => { const v = form.get(k); return typeof v === "string" ? v : undefined; };
  return AddressSchema.safeParse({
    label: s("label"), recipient: s("recipient"), street: s("street"), extNumber: s("extNumber"), intNumber: s("intNumber"),
    neighborhood: s("neighborhood"), city: s("city"), state: s("state"), zip: s("zip"), phone: s("phone"),
    isDefault: form.get("isDefault") === "on",
  });
}

export async function saveAddress(_prev: AddressState | undefined, form: FormData): Promise<AddressState> {
  const me = await who();
  if (!me) return { message: "No disponible." };
  const parsed = parse(form);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!errors[k]) errors[k] = i.message; }
    return { errors };
  }
  const d = parsed.data;
  const id = String(form.get("id") ?? "");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(addresses)
    .where(and(eq(addresses.siteId, me.siteId), eq(addresses.customerId, me.customerId)));
  const isDefault = d.isDefault || n === 0;
  if (isDefault) {
    await db.update(addresses).set({ isDefault: false })
      .where(and(eq(addresses.siteId, me.siteId), eq(addresses.customerId, me.customerId)));
  }
  const values = {
    label: d.label, recipient: d.recipient, street: d.street, extNumber: d.extNumber || null, intNumber: d.intNumber || null,
    neighborhood: d.neighborhood || null, city: d.city, state: d.state, zip: d.zip, phone: d.phone || null, isDefault,
  };
  if (id) {
    await db.update(addresses).set(values)
      .where(and(eq(addresses.id, id), eq(addresses.siteId, me.siteId), eq(addresses.customerId, me.customerId)));
  } else {
    await db.insert(addresses).values({ ...values, siteId: me.siteId, customerId: me.customerId });
  }
  revalidatePath("/store/[host]/mi-cuenta/direcciones", "page");
  return { ok: true, message: "Dirección guardada." };
}

export async function deleteAddress(id: string) {
  const me = await who();
  if (!me) return;
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.siteId, me.siteId), eq(addresses.customerId, me.customerId)));
  revalidatePath("/store/[host]/mi-cuenta/direcciones", "page");
}

export async function setDefaultAddress(id: string) {
  const me = await who();
  if (!me) return;
  await db.update(addresses).set({ isDefault: false }).where(and(eq(addresses.siteId, me.siteId), eq(addresses.customerId, me.customerId)));
  await db.update(addresses).set({ isDefault: true })
    .where(and(eq(addresses.id, id), eq(addresses.siteId, me.siteId), eq(addresses.customerId, me.customerId)));
  revalidatePath("/store/[host]/mi-cuenta/direcciones", "page");
}
