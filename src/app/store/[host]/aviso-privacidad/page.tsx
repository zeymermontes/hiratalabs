import type { Metadata } from "next";
import { getStorefront } from "@/lib/storefront";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aviso de privacidad" };

export default async function PrivacyPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  const { config } = ctx;
  const text = config.custom.privacy;

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 36, marginBottom: 20 }}>Aviso de privacidad</h1>
      {text ? (
        <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, fontSize: 15 }}>{text}</div>
      ) : (
        <div style={{ lineHeight: 1.6, fontSize: 15 }} className="sf-muted">
          <p>{config.brandName} recaba los datos necesarios para procesar tus pedidos (nombre, contacto y dirección de entrega) y no los comparte con terceros salvo los servicios de pago y envío que intervienen en tu compra.</p>
          <p>Para ejercer tus derechos ARCO escríbenos a {config.email || "nuestro correo de contacto"}.</p>
        </div>
      )}
    </div>
  );
}
