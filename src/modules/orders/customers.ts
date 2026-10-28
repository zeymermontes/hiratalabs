import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { customers, type Customer } from "@/lib/db/schema";
import { supabaseServer } from "@/lib/supabase/server";

export type CustomerSession = {
  customer: Customer;
  user: { id: string; email: string };
};

/**
 * Quién está comprando. La sesión es de Supabase Auth (cookies del host de la
 * tienda); el cliente es la fila customers de ESTA tienda para ese usuario.
 * Un mismo usuario puede tener cuenta en varias tiendas: nunca se busca solo
 * por user_id. Se memoriza por request.
 */
export const getCustomerSession = cache(async (siteId: string): Promise<CustomerSession | null> => {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user?.email) return null;
  const [customer] = await db.select().from(customers)
    .where(and(eq(customers.siteId, siteId), eq(customers.userId, data.user.id)));
  if (!customer) return null;
  return { customer, user: { id: data.user.id, email: data.user.email.toLowerCase() } };
});

/**
 * Crea (o devuelve) la fila customers de esta tienda para un usuario autenticado.
 * Se llama al registrarse, al entrar y al volver del enlace de confirmación.
 */
export async function ensureCustomer(
  siteId: string,
  user: { id: string; email: string; fullName?: string | null; phone?: string | null },
): Promise<Customer> {
  const email = user.email.trim().toLowerCase();
  const [existing] = await db.select().from(customers)
    .where(and(eq(customers.siteId, siteId), eq(customers.userId, user.id)));
  if (existing) {
    if ((user.fullName && !existing.fullName) || (user.phone && !existing.phone)) {
      const [updated] = await db.update(customers).set({
        fullName: existing.fullName ?? user.fullName ?? null,
        phone: existing.phone ?? user.phone ?? null,
      }).where(eq(customers.id, existing.id)).returning();
      return updated;
    }
    return existing;
  }
  const [created] = await db.insert(customers).values({
    siteId, userId: user.id, email, fullName: user.fullName ?? null, phone: user.phone ?? null,
  }).onConflictDoUpdate({
    // El mismo correo ya era cliente (p. ej. se recreó el usuario en Supabase): se reasigna.
    target: [customers.siteId, customers.email],
    set: { userId: user.id },
  }).returning();
  return created;
}
