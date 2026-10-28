import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { addItem, removeItem, updateItemQty, type CartResult } from "@/modules/orders/cart";
import { clientIp, storeFromRequest } from "@/modules/orders/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

async function guard(req: NextRequest) {
  const rl = rateLimit(`cart:mut:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return { error: NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 }) };
  const ctx = await storeFromRequest(req);
  if (!ctx) return { error: NextResponse.json({ ok: false, error: "unknown_site" }, { status: 404 }) };
  if (!ctx.modules.has("orders")) return { error: NextResponse.json({ ok: false, error: "orders_disabled" }, { status: 403 }) };
  if (ctx.site.status !== "live") return { error: NextResponse.json({ ok: false, error: "site_unavailable" }, { status: 403 }) };
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error();
  } catch {
    return { error: NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 }) };
  }
  return { ctx, body };
}

function reply(r: CartResult) {
  return r.ok
    ? NextResponse.json(r, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json(r, { status: 400 });
}

/**
 * Agregar al carrito. Body: { productId, variantId?, quantity?, customization?, uploadedFileUrl? }
 * Responde { ok: true, count } (count = artículos en el carrito) o { ok: false, error }.
 */
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;
  const { ctx, body } = g;
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!UUID.test(productId)) return NextResponse.json({ ok: false, error: "Producto inválido." }, { status: 400 });
  const variantId = typeof body.variantId === "string" && UUID.test(body.variantId) ? body.variantId : null;
  const customization = body.customization && typeof body.customization === "object" && !Array.isArray(body.customization)
    ? (body.customization as Record<string, unknown>) : null;
  const uploadedFileUrl = typeof body.uploadedFileUrl === "string" && /^https?:\/\//.test(body.uploadedFileUrl) ? body.uploadedFileUrl : null;

  return reply(await addItem(ctx.site.id, {
    productId, variantId, quantity: Number(body.quantity ?? 1), customization, uploadedFileUrl,
  }));
}

/** Cambiar cantidad. Body: { itemId, quantity } (0 = quitar). */
export async function PATCH(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;
  const { ctx, body } = g;
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!UUID.test(itemId)) return NextResponse.json({ ok: false, error: "Artículo inválido." }, { status: 400 });
  return reply(await updateItemQty(ctx.site.id, itemId, Number(body.quantity)));
}

/** Quitar. Body: { itemId }. */
export async function DELETE(req: NextRequest) {
  const g = await guard(req);
  if ("error" in g) return g.error;
  const { ctx, body } = g;
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!UUID.test(itemId)) return NextResponse.json({ ok: false, error: "Artículo inválido." }, { status: 400 });
  return reply(await removeItem(ctx.site.id, itemId));
}
