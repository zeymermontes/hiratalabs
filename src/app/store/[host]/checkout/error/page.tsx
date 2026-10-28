import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { SfPageHead } from "@/components/storefront/checkout-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pago no completado" };

type Props = { params: Promise<{ host: string }>; searchParams: Promise<{ o?: string }> };

export default async function CheckoutErrorPage({ params, searchParams }: Props) {
  const { host } = await params;
  const { o } = await searchParams;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("orders")) notFound();

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 640 }}>
      <SfPageHead eyebrow="Pago" title="No pudimos completar tu pago">
        No se hizo ningún cargo. Puedes intentar de nuevo con otra tarjeta o elegir pagar en efectivo o por transferencia.
      </SfPageHead>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {o && /^[0-9a-f-]{36}$/i.test(o) ? <Link href={`/checkout/pagar/${o}?nuevo=1`} className="sf-btn sf-btn-primary">Volver a intentar</Link> : null}
        <Link href="/carrito" className="sf-btn sf-btn-outline">Ir al carrito</Link>
        {ctx.config.whatsappHref ? <a href={ctx.config.whatsappHref} target="_blank" rel="noreferrer" className="sf-btn sf-btn-ghost">Escríbenos por WhatsApp</a> : null}
      </div>
    </div>
  );
}
