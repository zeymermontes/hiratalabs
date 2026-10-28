import { NextResponse, type NextRequest } from "next/server";
import { getMpConfig, MpError, mpGetPayment, verifyWebhookSignature } from "@/modules/orders/mercadopago";
import { applyPaymentResult } from "@/modules/orders/orders";
import { storeFromRequest } from "@/modules/orders/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notificaciones de Mercado Pago. Hay una URL por tienda
 * (https://<host de la tienda>/api/store/webhooks/mercadopago), así que el host
 * dice de qué tienda es y con qué credenciales consultar el pago.
 *
 * Nunca se confía en el cuerpo: se consulta el pago en la API de MP y de ahí
 * sale el estado real. Es el único aviso que llega para OXXO / SPEI, donde el
 * cliente paga horas después. MP reintenta si no respondemos 2xx, y puede
 * mandar la misma notificación varias veces: todo es idempotente.
 */
export async function POST(req: NextRequest) {
  const ctx = await storeFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: true, ignored: "unknown_site" });
  const mp = await getMpConfig(ctx.site.id);
  if (!mp) return NextResponse.json({ ok: true, ignored: "not_configured" });

  const url = new URL(req.url);
  let body: { type?: string; action?: string; data?: { id?: string | number } } | null = null;
  try { body = await req.json(); } catch { body = null; }

  const type = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const rawId = body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const paymentId = rawId ? String(rawId) : null;

  if (mp.webhookSecret) {
    const ok = verifyWebhookSignature(req.headers.get("x-signature"), req.headers.get("x-request-id") ?? "", paymentId ?? "", mp.webhookSecret);
    if (!ok) {
      console.warn(`[mp/webhook] firma inválida (site ${ctx.site.id})`);
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }
  }

  if (type !== "payment" || !paymentId) return NextResponse.json({ ok: true, ignored: true });

  let payment;
  try {
    payment = await mpGetPayment(mp.accessToken, paymentId);
  } catch (e) {
    // 404 = id inexistente: el botón "Simular" del panel de MP manda uno falso. Se acepta.
    if (e instanceof MpError && e.status === 404) return NextResponse.json({ ok: true, payment_not_found: true });
    console.error("[mp/webhook] no se pudo consultar el pago:", e);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ ok: true, no_order: true });

  const res = await applyPaymentResult(ctx.site.id, orderId, payment, "webhook");
  if (!res) return NextResponse.json({ ok: true, no_order: true });
  return NextResponse.json({ ok: true, order_id: orderId, status: payment.status });
}

/** MP a veces prueba la URL con GET al registrarla. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
