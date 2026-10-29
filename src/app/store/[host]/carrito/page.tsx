import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { CartView } from "@/components/storefront/cart-view";
import { SfPageHead } from "@/components/storefront/checkout-ui";
import { getCart } from "@/modules/orders/cart";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Carrito" };

export default async function CartPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("orders")) notFound();

  const cart = await getCart(ctx.site.id);

  return (
    <div className="sf-wrap sf-section">
      <SfPageHead eyebrow="Tu carrito" title={cart.items.length ? `${cart.count} ${cart.count === 1 ? "artículo" : "artículos"}` : "Carrito"} />
      {cart.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <p style={{ fontSize: 17, margin: 0 }}>Tu carrito está vacío.</p>
          <Link href="/productos" className="sf-btn sf-btn-primary">Ver productos</Link>
        </div>
      ) : (
        <CartView items={cart.items} subtotalCents={cart.subtotalCents} checkoutEnabled={ctx.modules.has("payments_mercadopago")} />
      )}
    </div>
  );
}
