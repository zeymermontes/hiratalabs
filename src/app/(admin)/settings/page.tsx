import { getGlobalSettings } from "@/lib/settings";
import { ContactForm } from "@/components/contact-form";
import { TestEmailForm } from "@/components/test-email-form";
import { PageHeader } from "@/components/ui";
import { saveGlobalSettings } from "../actions";

export const dynamic = "force-dynamic";

export default async function GlobalSettingsPage() {
  const g = await getGlobalSettings();

  return (
    <>
      <PageHeader
        title="Datos globales"
        subtitle="Valores por defecto para todas las landings. Cada sitio puede sobrescribir lo que necesite."
      />

      <div className="space-y-6">
        <ContactForm
          scope="global"
          action={saveGlobalSettings}
          values={{
            brandName: g?.brandName ?? "",
            email: g?.email ?? "",
            phone: g?.phone ?? "",
            whatsapp: g?.whatsapp ?? "",
            address: g?.address ?? "",
            socials: g?.socials ?? {},
            formRecipients: g?.formRecipients ?? [],
            formSubject: g?.formSubject ?? "",
            custom: g?.custom ?? {},
          }}
        />
        <TestEmailForm defaultTo={(g?.formRecipients ?? []).join(", ")} siteName={g?.brandName || "Hirata Labs"} />
      </div>
    </>
  );
}
