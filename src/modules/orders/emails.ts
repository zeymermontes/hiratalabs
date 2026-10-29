import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains, orderEmailLog, sites, type Order, type OrderItem, type OrderStatus } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { MAIL_PALETTE, sendEmail } from "@/lib/mailer";
import { getSiteSettings } from "@/lib/settings";
import { formatMXN } from "@/lib/storefront";
import { resolveTheme } from "@/lib/theme";
import { ORDER_STATUS_CUSTOMER_TEXT, ORDER_STATUS_LABEL, loadOrder, orderRef, type OrderDetail } from "./orders";
import { storeUrl } from "./request";
import { getTrackingUrl } from "./shipping-carriers";

const { INK, BONE, MUTED, LINE, BODY, MONO } = MAIL_PALETTE;

function esc(v: string) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type StoreMail = {
  siteId: string;
  brandName: string;
  host: string;
  primary: string;
  primaryFg: string;
  contactEmail: string | null;
  recipients: string[];
};

/** Marca, host público y destinatarios de avisos de una tienda. */
async function storeMail(siteId: string): Promise<StoreMail | null> {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return null;
  const settings = await getSiteSettings(siteId);
  const [domain] = await db.select({ hostname: domains.hostname }).from(domains)
    .where(and(eq(domains.siteId, siteId), eq(domains.status, "verified")))
    .orderBy(desc(domains.isPrimary)).limit(1);
  const theme = resolveTheme(site.theme);
  return {
    siteId,
    brandName: settings.brandName?.trim() || site.name,
    host: domain?.hostname ?? siteHost(site.slug, env.rootDomain),
    primary: theme.colors.primary,
    primaryFg: theme.colors.primaryForeground,
    contactEmail: settings.email?.trim() || null,
    recipients: (settings.formRecipients ?? []).filter(Boolean),
  };
}

/* ------------------------------ plantilla ------------------------------ */

function itemsTable(items: OrderItem[]) {
  return items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${BODY};font-size:14px;color:${INK};">
        ${esc(i.productName)}${i.variantName ? `<br><span style="color:${MUTED};font-size:12px;">${esc(i.variantName)}</span>` : ""}
        <br><span style="color:${MUTED};font-size:12px;">${i.quantity} × ${formatMXN(i.unitPriceCents)}</span>
      </td>
      <td align="right" style="padding:10px 0;border-top:1px solid ${LINE};font-family:${BODY};font-size:14px;color:${INK};white-space:nowrap;">
        ${formatMXN(i.unitPriceCents * i.quantity)}
      </td>
    </tr>`).join("");
}

function totalsRows(o: Order) {
  const row = (k: string, v: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;font-family:${BODY};font-size:${strong ? 16 : 13}px;color:${strong ? INK : MUTED};${strong ? "font-weight:700;" : ""}">${k}</td>
      <td align="right" style="padding:4px 0;font-family:${BODY};font-size:${strong ? 16 : 13}px;color:${INK};${strong ? "font-weight:700;" : ""}">${v}</td>
    </tr>`;
  return [
    row("Subtotal", formatMXN(o.subtotalCents)),
    o.discountCents > 0 ? row("Descuento", `-${formatMXN(o.discountCents)}`) : "",
    row(o.fulfillment === "pickup" ? "Entrega (recoger en tienda)" : "Envío", o.shippingCents === 0 ? "Gratis" : formatMXN(o.shippingCents)),
    row("Total", formatMXN(o.totalCents), true),
  ].join("");
}

function addressBlock(o: Order) {
  const a = o.addressSnapshot;
  if (o.fulfillment === "pickup" || !a) return "";
  const line = [a.street, a.extNumber, a.intNumber ? `int. ${a.intNumber}` : null].filter(Boolean).join(" ");
  return `
    <div style="margin-top:18px;padding:12px 14px;background:${BONE};border-radius:8px;font-family:${BODY};font-size:13px;color:${INK};line-height:1.5;">
      <strong>Envío a:</strong><br>${esc(a.recipient)}<br>${esc(line)}${a.neighborhood ? `, ${esc(a.neighborhood)}` : ""}<br>${esc(a.zip)} ${esc(a.city)}, ${esc(a.state)}${a.phone ? `<br>Tel. ${esc(a.phone)}` : ""}
    </div>`;
}

function layout(s: StoreMail, opts: { title: string; intro: string; body: string; cta?: { label: string; href: string } | null; footer?: string }) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${BONE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">
        <tr><td style="background:${s.primary};padding:20px 28px;">
          <span style="font-family:${BODY};font-size:20px;font-weight:800;color:${s.primaryFg};letter-spacing:-.01em;">${esc(s.brandName)}</span>
        </td></tr>
        <tr><td style="padding:26px 28px 6px;">
          <div style="font-family:${BODY};font-size:24px;font-weight:800;color:${INK};line-height:1.15;">${esc(opts.title)}</div>
          <div style="font-family:${BODY};font-size:15px;color:${MUTED};margin-top:8px;line-height:1.5;">${opts.intro}</div>
        </td></tr>
        <tr><td style="padding:12px 28px 8px;">${opts.body}</td></tr>
        ${opts.cta ? `<tr><td style="padding:10px 28px 26px;">
          <a href="${esc(opts.cta.href)}" style="display:inline-block;background:${s.primary};color:${s.primaryFg};font-family:${BODY};font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px;">${esc(opts.cta.label)}</a>
        </td></tr>` : ""}
        <tr><td style="background:${INK};padding:16px 28px;">
          <div style="font-family:${MONO};font-size:11px;color:${BONE};opacity:.75;line-height:1.7;">${esc(s.host)}${opts.footer ? `<br>${opts.footer}` : ""}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function textVersion(s: StoreMail, title: string, lines: string[]) {
  return [s.brandName, title, "", ...lines, "", s.host].join("\n");
}

async function log(orderId: string, kind: string, to: string, r: { ok: boolean; error?: string }) {
  await db.insert(orderEmailLog).values({ orderId, kind, toEmail: to, ok: r.ok, error: r.error ?? null }).catch(() => null);
}

function orderLines(d: OrderDetail) {
  return [
    ...d.items.map((i) => `- ${i.productName}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity}: ${formatMXN(i.unitPriceCents * i.quantity)}`),
    `Subtotal: ${formatMXN(d.order.subtotalCents)}`,
    `Envío: ${d.order.shippingCents === 0 ? "Gratis" : formatMXN(d.order.shippingCents)}`,
    `Total: ${formatMXN(d.order.totalCents)}`,
  ];
}

/* ------------------------------- correos ------------------------------- */

/** "Recibimos tu pedido" — al crear el pedido (aún sin pagar). */
export async function sendOrderReceived(siteId: string, orderId: string) {
  const [s, d] = await Promise.all([storeMail(siteId), loadOrder(siteId, orderId)]);
  if (!s || !d) return;
  const ref = orderRef(d.order);
  const payUrl = storeUrl(s.host, `/checkout/pagar/${d.order.id}`);
  const html = layout(s, {
    title: `Recibimos tu pedido ${ref}`,
    intro: `Hola ${esc(d.order.fullName)}. Tu pedido quedó registrado${d.order.status === "pending" ? ", solo falta el pago" : ""}.`,
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsTable(d.items)}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:2px solid ${INK};padding-top:6px;">${totalsRows(d.order)}</table>${addressBlock(d.order)}`,
    cta: d.order.status === "pending" ? { label: "Completar el pago", href: payUrl } : null,
    footer: s.contactEmail ? `¿Dudas? Escríbenos a ${esc(s.contactEmail)}` : undefined,
  });
  const r = await sendEmail({
    to: [d.order.email], subject: `Recibimos tu pedido ${ref} — ${s.brandName}`, html,
    text: textVersion(s, `Recibimos tu pedido ${ref}`, [...orderLines(d), "", `Completar el pago: ${payUrl}`]),
    replyTo: s.contactEmail ?? undefined,
  });
  await log(orderId, "received", d.order.email, r);
}

/** Pago confirmado → cliente, y aviso de pedido nuevo → la tienda. */
export async function notifyOrderPaid(siteId: string, orderId: string) {
  const [s, d] = await Promise.all([storeMail(siteId), loadOrder(siteId, orderId)]);
  if (!s || !d) return;
  const ref = orderRef(d.order);
  const orderUrl = storeUrl(s.host, d.order.customerId ? `/mi-cuenta/pedidos/${d.order.id}` : `/checkout/success?o=${d.order.id}`);

  const html = layout(s, {
    title: `¡Gracias por tu compra! ${ref}`,
    intro: `Hola ${esc(d.order.fullName)}. Recibimos tu pago y ya estamos preparando tu pedido.${d.order.fulfillment === "pickup" ? " Te avisamos por correo cuando esté listo para recoger." : " Te avisamos cuando salga en camino."}`,
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsTable(d.items)}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:2px solid ${INK};padding-top:6px;">${totalsRows(d.order)}</table>${addressBlock(d.order)}`,
    cta: { label: "Ver mi pedido", href: orderUrl },
    footer: s.contactEmail ? `¿Dudas? Escríbenos a ${esc(s.contactEmail)}` : undefined,
  });
  const r = await sendEmail({
    to: [d.order.email], subject: `Pago confirmado · pedido ${ref} — ${s.brandName}`, html,
    text: textVersion(s, `Pago confirmado · pedido ${ref}`, [...orderLines(d), "", `Ver pedido: ${orderUrl}`]),
    replyTo: s.contactEmail ?? undefined,
  });
  await log(orderId, "paid", d.order.email, r);

  if (s.recipients.length) {
    const adminUrl = `${env.appUrl}/sites/${siteId}/orders/${d.order.id}`;
    const who = [d.order.fullName, d.order.email, d.order.phone].filter(Boolean).join(" · ");
    const mHtml = layout(s, {
      title: `Nuevo pedido pagado ${ref}`,
      intro: `${esc(who)}<br>${d.order.fulfillment === "pickup" ? "Recoge en tienda." : "Envío a domicilio."}`,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsTable(d.items)}</table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:2px solid ${INK};padding-top:6px;">${totalsRows(d.order)}</table>${addressBlock(d.order)}`,
      cta: { label: "Abrir en el panel", href: adminUrl },
    });
    const mr = await sendEmail({
      to: s.recipients, subject: `Nuevo pedido ${ref} · ${formatMXN(d.order.totalCents)} — ${s.brandName}`, html: mHtml,
      text: textVersion(s, `Nuevo pedido pagado ${ref}`, [who, "", ...orderLines(d), "", `Panel: ${adminUrl}`]),
      replyTo: d.order.email,
    });
    await log(orderId, "merchant_new_order", s.recipients.join(", "), mr);
  }
}

/** Cambio de estado hecho desde el panel (o cancelación automática). */
export async function notifyStatusChange(siteId: string, orderId: string, status: OrderStatus) {
  if (status === "pending" || status === "paid") return; // paid tiene su propio correo
  const [s, d] = await Promise.all([storeMail(siteId), loadOrder(siteId, orderId)]);
  if (!s || !d) return;
  const ref = orderRef(d.order);
  const o = d.order;
  const orderUrl = storeUrl(s.host, o.customerId ? `/mi-cuenta/pedidos/${o.id}` : `/checkout/success?o=${o.id}`);
  const trackingUrl = getTrackingUrl(o.trackingCarrier, o.trackingNumber);

  let extra = "";
  if (status === "shipped" && o.trackingNumber) {
    extra = `<div style="margin-top:14px;padding:12px 14px;background:${BONE};border-radius:8px;font-family:${BODY};font-size:13px;color:${INK};line-height:1.6;">
      <strong>Paquetería:</strong> ${esc(o.trackingCarrier ?? "—")}<br><strong>Guía:</strong> <span style="font-family:${MONO}">${esc(o.trackingNumber)}</span>
      ${trackingUrl ? `<br><a href="${esc(trackingUrl)}" style="color:${s.primary};font-weight:700;">Rastrear envío</a>` : ""}</div>`;
  }
  const html = layout(s, {
    title: `${ORDER_STATUS_LABEL[status]} · pedido ${ref}`,
    intro: `Hola ${esc(o.fullName)}. ${esc(ORDER_STATUS_CUSTOMER_TEXT[status])}`,
    body: `${extra}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${itemsTable(d.items)}</table>`,
    cta: { label: "Ver mi pedido", href: orderUrl },
    footer: s.contactEmail ? `¿Dudas? Escríbenos a ${esc(s.contactEmail)}` : undefined,
  });
  const r = await sendEmail({
    to: [o.email], subject: `${ORDER_STATUS_LABEL[status]} · pedido ${ref} — ${s.brandName}`, html,
    text: textVersion(s, `${ORDER_STATUS_LABEL[status]} · pedido ${ref}`, [
      ORDER_STATUS_CUSTOMER_TEXT[status],
      ...(o.trackingNumber ? [`Paquetería: ${o.trackingCarrier ?? "—"}`, `Guía: ${o.trackingNumber}`, ...(trackingUrl ? [trackingUrl] : [])] : []),
      "", `Ver pedido: ${orderUrl}`,
    ]),
    replyTo: s.contactEmail ?? undefined,
  });
  await log(orderId, `status_${status}`, o.email, r);
}

/** Botón "Reenviar confirmación" del panel: el correo que corresponde al estado actual. */
export async function resendConfirmation(siteId: string, orderId: string) {
  const d = await loadOrder(siteId, orderId);
  if (!d) return;
  if (d.order.status === "pending") return sendOrderReceived(siteId, orderId);
  if (d.order.status === "paid") return notifyOrderPaid(siteId, orderId);
  return notifyStatusChange(siteId, orderId, d.order.status);
}
