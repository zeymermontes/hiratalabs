import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { getCart } from "@/modules/orders/cart";
import { clientIp, storeFromRequest } from "@/modules/orders/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** El carrito del visitante, con precios vigentes y totales. */
export async function GET(req: NextRequest) {
  const rl = rateLimit(`cart:get:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const ctx = await storeFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "unknown_site" }, { status: 404 });
  if (!ctx.modules.has("orders")) return NextResponse.json({ ok: false, error: "orders_disabled" }, { status: 403 });

  const cart = await getCart(ctx.site.id);
  return NextResponse.json({ ok: true, ...cart }, { headers: { "Cache-Control": "no-store" } });
}
