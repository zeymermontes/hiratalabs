import type { Metadata } from "next";
import { getStorefront } from "@/lib/storefront";
import { ContactForm } from "@/components/storefront/contact-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contacto" };

export default async function ContactPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const ctx = await getStorefront(host);
  if (!ctx) return null;
  const { config, modules } = ctx;

  return (
    <div className="sf-wrap sf-section">
      <div className="sf-eyebrow">Contacto</div>
      <h1 style={{ fontSize: 40, marginTop: 8, marginBottom: 24 }}>Hablemos</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40 }}>
        <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 14, fontSize: 15 }}>
          {config.whatsappHref ? <a className="sf-btn sf-btn-primary" href={config.whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a> : null}
          {config.phone ? <div><strong>Teléfono</strong><br /><a href={config.phoneHref}>{config.phone}</a></div> : null}
          {config.email ? <div><strong>Correo</strong><br /><a href={config.emailHref}>{config.email}</a></div> : null}
          {config.address ? <div><strong>Dirección</strong><br /><a href={config.addressHref} target="_blank" rel="noreferrer">{config.address}</a></div> : null}
        </div>
        {modules.has("forms") ? (
          <div style={{ flex: "1 1 360px" }}>
            <ContactForm endpoint={config.formEndpoint} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
