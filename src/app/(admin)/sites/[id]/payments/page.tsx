import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { encryptionConfigured } from "@/lib/crypto";
import { db } from "@/lib/db";
import { domains, sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { PageHeader } from "@/components/ui";
import { getMpStoredConfig, webhookUrlFor } from "@/modules/orders/mercadopago";
import { PaymentsForm } from "./payments-form";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id);
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const cfg = await getMpStoredConfig(id);
  const [domain] = await db.select({ hostname: domains.hostname }).from(domains)
    .where(and(eq(domains.siteId, id), eq(domains.status, "verified"))).orderBy(desc(domains.isPrimary)).limit(1);
  const host = domain?.hostname ?? siteHost(site.slug, env.rootDomain);
  const configured = Boolean(cfg.publicKey && cfg.accessTokenEnc);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos con Mercado Pago"
        subtitle="Tarjeta, OXXO y transferencia desde la tienda. Cada tienda cobra con su propia cuenta de Mercado Pago."
        actions={
          <span className={`pill ${configured ? (cfg.mode === "live" ? "bg-lime-tint text-lime-dark" : "bg-amber-50 text-amber-700") : "bg-neutral-100 text-neutral-600"}`}>
            {configured ? (cfg.mode === "live" ? "Cobrando en producción" : "Modo de pruebas") : "Sin configurar"}
          </span>
        }
      />

      {!encryptionConfigured() ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          La plataforma no tiene <code>ENCRYPTION_KEY</code>. Sin ella no se pueden guardar credenciales de pago.
        </p>
      ) : null}

      {!configured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Mientras no haya credenciales, los clientes pueden armar su carrito y registrar pedidos, pero no pagar en línea.
        </p>
      ) : null}

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">URL del webhook</h3>
        <p className="hint mb-2">Regístrala en Mercado Pago (tu aplicación → Webhooks → evento Pagos) con el modo que corresponda a las credenciales.</p>
        <code className="block break-all rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-800">{webhookUrlFor(host)}</code>
        {!domain ? <p className="hint mt-2">Si después conectas un dominio propio, vuelve a registrar la URL con ese dominio.</p> : null}
      </section>

      <PaymentsForm
        siteId={id}
        canManage={access.canManage}
        values={{
          publicKey: cfg.publicKey ?? "",
          accessTokenHint: cfg.accessTokenHint ?? null,
          mode: cfg.mode ?? null,
          statementDescriptor: cfg.statementDescriptor ?? "",
          hasWebhookSecret: Boolean(cfg.webhookSecret),
        }}
      />
    </div>
  );
}
