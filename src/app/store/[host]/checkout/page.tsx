import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { getStorefront } from "@/lib/storefront";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { SfAlert, SfPageHead } from "@/components/storefront/checkout-ui";
import { getCart } from "@/modules/orders/cart";
import { getCustomerSession } from "@/modules/orders/customers";
import { getMpConfig } from "@/modules/orders/mercadopago";
import { getShippingConfig } from "@/modules/orders/shipping-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("orders")) notFound();

  const cart = await getCart(ctx.site.id);
  const items = cart.items.filter((i) => !i.unavailable);
  if (items.length === 0) redirect("/carrito");

  const [shipping, mp] = await Promise.all([getShippingConfig(ctx.site.id), getMpConfig(ctx.site.id)]);
  const paymentsOn = ctx.modules.has("payments_mercadopago") && Boolean(mp);

  const customersEnabled = ctx.modules.has("customers");
  const session = customersEnabled ? await getCustomerSession(ctx.site.id) : null;
  const saved = session
    ? await db.select().from(addresses)
      .where(and(eq(addresses.siteId, ctx.site.id), eq(addresses.customerId, session.customer.id)))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt))
    : [];

  return (
    <div className="sf-wrap sf-section">
      <SfPageHead eyebrow="Finalizar compra" title="Casi listo">
        Revisa tus datos y elige cómo recibir tu pedido.
      </SfPageHead>
      {!paymentsOn ? (
        <div style={{ marginBottom: 20 }}>
          <SfAlert tone="info">Esta tienda aún no tiene activados los pagos en línea. Puedes registrar tu pedido y te contactamos para cobrarlo.</SfAlert>
        </div>
      ) : null}
      <CheckoutForm
        items={items.map((i) => ({ id: i.id, name: i.name, variantName: i.variantName, imageUrl: i.imageUrl, quantity: i.quantity, lineTotalCents: i.lineTotalCents }))}
        subtotalCents={cart.subtotalCents}
        shipping={shipping}
        contact={{
          email: session?.customer.email ?? "",
          fullName: session?.customer.fullName ?? "",
          phone: session?.customer.phone ?? "",
        }}
        loggedIn={Boolean(session)}
        customersEnabled={customersEnabled}
        addresses={saved.map((a) => ({
          id: a.id, label: a.label, recipient: a.recipient, street: a.street, extNumber: a.extNumber,
          neighborhood: a.neighborhood, city: a.city, state: a.state, zip: a.zip, isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
