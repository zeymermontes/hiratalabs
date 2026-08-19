import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getGlobalSettings, getSiteSettings, resolveSettings } from "@/lib/settings";
import { ContactForm } from "@/components/contact-form";
import { TestEmailForm } from "@/components/test-email-form";
import { saveSiteSettings } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const [row, global, effective] = await Promise.all([
    getSiteSettings(id),
    getGlobalSettings(),
    resolveSettings(id, site.name),
  ]);

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
        Lo que dejes vacío se hereda de los <strong>datos globales</strong>. Los cambios se reflejan en la landing
        de inmediato, sin volver a subir el ZIP.
      </p>

      <ContactForm
        scope="site"
        siteId={id}
        action={saveSiteSettings}
        values={{
          brandName: row?.brandName ?? "",
          email: row?.email ?? "",
          phone: row?.phone ?? "",
          whatsapp: row?.whatsapp ?? "",
          address: row?.address ?? "",
          socials: row?.socials ?? {},
          formRecipients: row?.formRecipients ?? [],
          formSubject: row?.formSubject ?? "",
          custom: row?.custom ?? {},
        }}
        inherited={{
          brandName: global?.brandName ?? "",
          email: global?.email ?? "",
          phone: global?.phone ?? "",
          whatsapp: global?.whatsapp ?? "",
          address: global?.address ?? "",
          socials: global?.socials ?? {},
          formRecipients: global?.formRecipients ?? [],
          formSubject: global?.formSubject ?? "",
          custom: global?.custom ?? {},
        }}
      />

      <TestEmailForm defaultTo={effective.formRecipients.join(", ")} siteName={site.name} />
    </div>
  );
}
