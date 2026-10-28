import { notFound, redirect } from "next/navigation";
import { getStorefront, type StorefrontContext } from "@/lib/storefront";
import { getCustomerSession, type CustomerSession } from "./customers";

/** Boilerplate de las páginas de "Mi cuenta": tienda + módulo + sesión obligatoria. */
export async function requireAccountPage(host: string, nextPath: string): Promise<{ ctx: StorefrontContext; session: CustomerSession } | null> {
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("customers") || !ctx.modules.has("orders")) notFound();
  const session = await getCustomerSession(ctx.site.id);
  if (!session) redirect(`/cuenta/login?next=${encodeURIComponent(nextPath)}`);
  return { ctx, session };
}
