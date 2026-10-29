import type { Metadata } from "next";
import Link from "next/link";
import { formatMXN } from "@/lib/storefront";
import { AuthForm } from "@/components/storefront/checkout-auth-form";
import { SfAccountNav, SfPageHead, SfStatusChip, sfPanel, toneFor } from "@/components/storefront/checkout-ui";
import { requireAccountPage } from "@/modules/orders/account";
import { customerSignOut } from "@/modules/orders/customer-auth";
import { ORDER_STATUS_LABEL, listCustomerOrders, orderRef } from "@/modules/orders/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const page = await requireAccountPage(host, "/mi-cuenta");
  if (!page) return null;
  const { ctx, session } = page;
  const recent = (await listCustomerOrders(ctx.site.id, session.customer.id)).slice(0, 3);
  const pendingPay = recent.filter((o) => o.status === "pending");

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 860 }}>
      <SfPageHead eyebrow="Mi cuenta" title={session.customer.fullName ? `Hola, ${session.customer.fullName.split(" ")[0]}` : "Hola"}>
        {session.customer.email}
      </SfPageHead>
      <SfAccountNav current="/mi-cuenta" />

      {pendingPay.length ? (
        <div style={{ ...sfPanel, borderColor: "var(--sf-primary)", marginBottom: 20 }}>
          <strong>Tienes {pendingPay.length === 1 ? "un pedido" : `${pendingPay.length} pedidos`} sin pagar.</strong>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pendingPay.map((o) => <Link key={o.id} href={`/checkout/pagar/${o.id}`} className="sf-btn sf-btn-primary" style={{ minHeight: 40 }}>Pagar pedido {orderRef(o)}</Link>)}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section style={sfPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ fontSize: 20 }}>Últimos pedidos</h2>
            <Link href="/mi-cuenta/pedidos" className="sf-link" style={{ minHeight: 0 }}>Ver todos</Link>
          </div>
          {recent.length === 0 ? (
            <p className="sf-muted" style={{ margin: 0 }}>Aún no tienes pedidos. <Link href="/productos" className="sf-link" style={{ minHeight: 0 }}>Ver productos</Link></p>
          ) : recent.map((o) => (
            <Link key={o.id} href={`/mi-cuenta/pedidos/${o.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--sf-muted)", fontSize: 14 }}>
              <span><strong>{orderRef(o)}</strong> · {formatMXN(o.totalCents)}</span>
              <SfStatusChip label={ORDER_STATUS_LABEL[o.status]} tone={toneFor(o.status)} />
            </Link>
          ))}
        </section>

        <section style={sfPanel}>
          <h2 style={{ fontSize: 20 }}>Mis datos</h2>
          <AuthForm mode="profile" defaults={{ fullName: session.customer.fullName ?? "", phone: session.customer.phone ?? "" }} />
          <Link href="/mi-cuenta/contrasena" className="sf-link" style={{ minHeight: 0 }}>Cambiar contraseña</Link>
          <form action={customerSignOut}>
            <button type="submit" className="sf-btn sf-btn-ghost" style={{ width: "100%" }}>Cerrar sesión</button>
          </form>
        </section>
      </div>
    </div>
  );
}
