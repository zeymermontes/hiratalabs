import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getSiteSettings } from "@/lib/settings";
import { ContactForm } from "@/components/contact-form";
import { TestEmailForm } from "@/components/test-email-form";
import { saveSiteSettings } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const row = await getSiteSettings(id);
  const recipients = (row?.formRecipients ?? []).filter(Boolean);

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
        Estos datos son solo de <strong>{site.name}</strong>. Lo que dejes vacío no se muestra en la landing:
        el elemento que lo contiene se oculta solo, así que nunca queda un enlace roto. Los cambios se ven
        de inmediato, sin volver a subir el ZIP.
      </p>

      {recipients.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Este sitio no tiene destinatarios para los formularios. Los mensajes se van a guardar en la pestaña
          <strong> Mensajes</strong>, pero nadie va a recibir un correo.
        </p>
      ) : null}

      <ContactForm
        siteId={id}
        action={saveSiteSettings}
        values={{
          brandName: row?.brandName ?? "",
          email: row?.email ?? "",
          phone: row?.phone ?? "",
          whatsapp: row?.whatsapp ?? "",
          address: row?.address ?? "",
          socials: row?.socials ?? {},
          formRecipients: recipients,
          formSubject: row?.formSubject ?? "",
          custom: row?.custom ?? {},
        }}
      />

      <TestEmailForm defaultTo={recipients.join(", ")} siteName={site.name} />
    </div>
  );
}
