import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { AddressBook } from "@/components/storefront/checkout-address-form";
import { SfAccountNav, SfPageHead } from "@/components/storefront/checkout-ui";
import { requireAccountPage } from "@/modules/orders/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis direcciones" };

export default async function AddressesPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const page = await requireAccountPage(host, "/mi-cuenta/direcciones");
  if (!page) return null;
  const rows = await db.select().from(addresses)
    .where(and(eq(addresses.siteId, page.ctx.site.id), eq(addresses.customerId, page.session.customer.id)))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

  return (
    <div className="sf-wrap sf-section" style={{ maxWidth: 720 }}>
      <SfPageHead eyebrow="Mi cuenta" title="Mis direcciones">Se usan para el envío en el checkout.</SfPageHead>
      <SfAccountNav current="/mi-cuenta/direcciones" />
      <AddressBook addresses={rows.map((a) => ({
        id: a.id, label: a.label, recipient: a.recipient, street: a.street, extNumber: a.extNumber, intNumber: a.intNumber,
        neighborhood: a.neighborhood, city: a.city, state: a.state, zip: a.zip, phone: a.phone, isDefault: a.isDefault,
      }))} />
    </div>
  );
}
