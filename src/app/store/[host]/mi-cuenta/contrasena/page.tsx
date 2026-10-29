import type { Metadata } from "next";
import { AuthForm } from "@/components/storefront/checkout-auth-form";
import { SfAccountNav, SfPageHead, sfPanel } from "@/components/storefront/checkout-ui";
import { requireAccountPage } from "@/modules/orders/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contraseña" };

export default async function PasswordPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const page = await requireAccountPage(host, "/mi-cuenta/contrasena");
  if (!page) return null;
  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 480 }}>
      <SfPageHead eyebrow="Mi cuenta" title="Nueva contraseña" />
      <SfAccountNav current="/mi-cuenta" />
      <div style={sfPanel}>
        <AuthForm mode="password" />
      </div>
    </div>
  );
}
