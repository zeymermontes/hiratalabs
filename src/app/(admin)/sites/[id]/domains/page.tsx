import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { dnsInstructions, renderConfigured } from "@/lib/render";
import { Empty } from "@/components/ui";
import { AddDomainForm, DomainRow } from "./domain-forms";

export const dynamic = "force-dynamic";

export default async function DomainsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(domains).where(eq(domains.siteId, id)).orderBy(desc(domains.createdAt));

  return (
    <div className="space-y-6">
      {!renderConfigured() ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Falta configurar <code>DEPLOY_API_KEY</code> en Render. Los dominios se guardan aquí,
          pero tendrás que darlos de alta a mano en Render para que emita el certificado.
        </p>
      ) : null}

      <AddDomainForm siteId={id} />

      {rows.length === 0 ? (
        <Empty
          title="Sin dominios propios"
          body={`Este sitio responde en su subdominio de ${env.rootDomain}. Agrega un dominio del cliente si quieres que también responda ahí.`}
        />
      ) : (
        <div className="card divide-y divide-neutral-200">
          {rows.map((d) => (
            <DomainRow
              key={d.id}
              siteId={id}
              domain={d}
              dns={dnsInstructions(d.hostname, env.renderServiceHost)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
