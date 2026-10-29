import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { getCustomerSession } from "@/modules/orders/customers";
import { getMpConfig, MpError, mpCreatePayment, paymentMessage } from "@/modules/orders/mercadopago";
import { applyPaymentResult, loadOrder, orderRef } from "@/modules/orders/orders";
import { clientIp, storeFromRequest, storeUrl } from "@/modules/orders/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cobra un pedido con lo que manda el Payment Brick (token de tarjeta o método
 * en efectivo/transferencia). El monto SIEMPRE sale del pedido en la base, no
 * del navegador. Idempotente por pedido + token: doble clic no cobra dos veces
 * y un reintento con otra tarjeta sí estrena clave (ver HANDOFF_MERCADOPAGO).
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`pay:${clientIp(req)}`, 20, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera un momento." }, { status: 429 });

  const ctx = await storeFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Tienda desconocida." }, { status: 404 });
  if (!ctx.modules.has("orders") || !ctx.modules.has("payments_mercadopago")) {
    return NextResponse.json({ ok: false, error: "Los pagos no están disponibles." }, { status: 403 });
  }
  const mp = await getMpConfig(ctx.site.id);
  if (!mp) return NextResponse.json({ ok: false, error: "La tienda aún no configura sus pagos." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }
  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  const detail = await loadOrder(ctx.site.id, orderId);
  if (!detail) return NextResponse.json({ ok: false, error: "Pedido no encontrado." }, { status: 404 });
  const { order, items } = detail;

  if (order.customerId) {
    const session = await getCustomerSession(ctx.site.id);
    if (!session || session.customer.id !== order.customerId) {
      return NextResponse.json({ ok: false, error: "Inicia sesión para pagar este pedido." }, { status: 401 });
    }
  }
  if (order.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Este pedido ya fue procesado.", status: order.status }, { status: 409 });
  }

  const amount = order.totalCents / 100;
  const submitted = Number(body.transaction_amount);
  if (!Number.isFinite(submitted) || Math.abs(submitted - amount) > 0.01) {
    return NextResponse.json({ ok: false, error: "El monto no coincide con el pedido. Recarga la página." }, { status: 400 });
  }

  const a = order.addressSnapshot;
  const [firstName, ...rest] = order.fullName.trim().split(/\s+/);
  const payer = (body.payer && typeof body.payer === "object" ? body.payer : {}) as Record<string, unknown>;
  const isLocal = ctx.host === "localhost" || ctx.host.endsWith(".localhost");

  const payload: Record<string, unknown> = {
    ...body,
    transaction_amount: amount,
    description: `${ctx.config.brandName} · pedido ${orderRef(order)}`,
    external_reference: order.id,
    payer: { ...payer, email: typeof payer.email === "string" && payer.email ? payer.email : order.email },
    metadata: { order_id: order.id, site_id: ctx.site.id, order_number: order.number },
    ...(mp.statementDescriptor ? { statement_descriptor: mp.statementDescriptor.slice(0, 22) } : {}),
    ...(isLocal ? {} : { notification_url: storeUrl(ctx.host, "/api/store/webhooks/mercadopago") }),
    additional_info: {
      // Sin currency_id: en /v1/payments ese campo tira la petición completa.
      items: items.map((i) => ({
        id: i.productId ?? i.id, title: i.productName.slice(0, 256), quantity: i.quantity, unit_price: i.unitPriceCents / 100,
      })),
      payer: {
        first_name: firstName, last_name: rest.join(" ") || undefined,
        ...(order.phone ? { phone: { number: order.phone.replace(/\D/g, "") } } : {}),
        ...(a ? { address: { zip_code: a.zip, street_name: a.street, street_number: a.extNumber ?? undefined } } : {}),
      },
      ...(a ? { shipments: { receiver_address: { zip_code: a.zip, street_name: a.street, street_number: a.extNumber ?? undefined, city_name: a.city, state_name: a.state } } } : {}),
    },
  };
  delete payload.order_id;

  const token = typeof body.token === "string" ? body.token : null;
  const idempotencyKey = token ? `order-${order.id}-${token.slice(0, 32)}` : `order-${order.id}`;

  let payment;
  try {
    payment = await mpCreatePayment(mp.accessToken, payload, idempotencyKey);
  } catch (e) {
    console.error(`[mp] payment create failed (site ${ctx.site.id}):`, e);
    const msg = e instanceof MpError ? e.message : "Mercado Pago no pudo procesar el pago.";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  await applyPaymentResult(ctx.site.id, order.id, payment, "checkout");

  return NextResponse.json({
    ok: true,
    status: payment.status,
    statusDetail: payment.status_detail ?? null,
    paymentId: String(payment.id),
    orderId: order.id,
    message: paymentMessage(payment.status, payment.status_detail),
  });
}
