import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { mergeGuestCart } from "@/modules/orders/cart";
import { ensureCustomer } from "@/modules/orders/customers";
import { storeFromRequest } from "@/modules/orders/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vuelta de los enlaces de Supabase en el host de la tienda (confirmar cuenta,
 * recuperar contraseña). Canjea el código, asegura la fila customers de ESTA
 * tienda y manda a `next`. Location relativa: detrás del proxy req.url no es
 * el host público.
 */
function go(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/mi-cuenta";
}

export async function GET(req: NextRequest) {
  const ctx = await storeFromRequest(req);
  if (!ctx || !ctx.modules.has("customers")) return go("/");
  const q = req.nextUrl.searchParams;
  const next = safeNext(q.get("next"));
  const code = q.get("code");
  if (q.get("error_description") ?? q.get("error")) return go("/cuenta/login?error=link");
  if (!code) return go("/cuenta/login");

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return go("/cuenta/login?error=link");

  const meta = (data.user.user_metadata ?? {}) as { full_name?: string; phone?: string };
  const customer = await ensureCustomer(ctx.site.id, { id: data.user.id, email: data.user.email, fullName: meta.full_name, phone: meta.phone });
  await mergeGuestCart(ctx.site.id, customer.id).catch(() => null);
  return go(next);
}
