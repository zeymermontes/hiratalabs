import Link from "next/link";
import { requireSiteAccess } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { getShippingConfig } from "@/modules/orders/shipping-server";
import { ShippingForm } from "./shipping-form";

export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccess(id, { manage: true });
  const values = await getShippingConfig(id);

  return (
    <div className="space-y-6">
      <Link href={`/sites/${id}/orders`} className="text-xs text-neutral-500 hover:text-neutral-800">← Pedidos</Link>
      <PageHeader title="Envío y entrega" subtitle="Cómo le llega el pedido al cliente y cuánto cuesta." />
      <ShippingForm siteId={id} values={values} />
    </div>
  );
}
