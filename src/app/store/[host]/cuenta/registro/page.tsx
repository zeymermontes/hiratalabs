import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getStorefront } from "@/lib/storefront";
import { AuthForm } from "@/components/storefront/checkout-auth-form";
import { SfPageHead, sfPanel } from "@/components/storefront/checkout-ui";
import { getCustomerSession } from "@/modules/orders/customers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear cuenta" };

type Props = { params: Promise<{ host: string }>; searchParams: Promise<{ next?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const { host } = await params;
  const { next } = await searchParams;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  if (!ctx.modules.has("customers")) notFound();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/mi-cuenta";
  if (await getCustomerSession(ctx.site.id)) redirect(safeNext);

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 480 }}>
      <SfPageHead eyebrow="Mi cuenta" title="Crear cuenta">Guarda tus direcciones y sigue tus pedidos.</SfPageHead>
      <div style={sfPanel}>
        <AuthForm mode="signup" next={safeNext} />
      </div>
    </div>
  );
}
