import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiKeys, aiUsage, sites } from "@/lib/db/schema";
import { encryptionConfigured } from "@/lib/crypto";
import { Empty, PageHeader } from "@/components/ui";
import { AddKeyForm, KeyRow } from "./key-forms";

export const dynamic = "force-dynamic";

export default async function AiKeysPage() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [keys, usage] = await Promise.all([
    db.select().from(aiKeys).orderBy(desc(aiKeys.createdAt)),
    db
      .select({
        siteName: sites.name,
        siteId: sites.id,
        calls: sql<number>`count(*) filter (where ${aiUsage.ok})::int`,
        failures: sql<number>`count(*) filter (where not ${aiUsage.ok})::int`,
      })
      .from(aiUsage)
      .innerJoin(sites, sql`${sites.id} = ${aiUsage.siteId}`)
      .where(sql`${aiUsage.createdAt} >= ${monthStart}`)
      .groupBy(sites.id, sites.name),
  ]);

  const byProvider = new Map<string, number>();
  keys.forEach((k) => byProvider.set(k.provider, (byProvider.get(k.provider) ?? 0) + 1));

  return (
    <>
      <PageHeader
        title="Llaves de IA"
        subtitle="Credenciales de la plataforma para el chat de cotización. Cada sitio elige si usa estas o la llave propia del cliente."
      />

      {!encryptionConfigured() ? (
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Falta <code>ENCRYPTION_KEY</code> en las variables de entorno (mínimo 32 caracteres). Sin ella no se
          pueden guardar llaves: se almacenan cifradas, nunca en texto plano.
        </p>
      ) : null}

      <div className="space-y-6">
        <AddKeyForm />

        {keys.length === 0 ? (
          <Empty
            title="Sin llaves todavía"
            body="Agrega al menos una para poder activar el chat en un sitio con las credenciales de la plataforma."
          />
        ) : (
          <div className="card divide-y divide-neutral-200">
            {keys.map((k) => (
              <KeyRow
                key={k.id}
                id={k.id}
                provider={k.provider}
                label={k.label}
                hint={k.hint}
                isDefault={k.isDefault}
                siblings={byProvider.get(k.provider) ?? 1}
              />
            ))}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Consumo de este mes</h2>
          {usage.length === 0 ? (
            <p className="hint">Todavía no hay llamadas registradas.</p>
          ) : (
            <div className="card divide-y divide-neutral-200">
              {usage.map((u) => (
                <div key={u.siteId} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex-1 truncate text-sm text-neutral-800">{u.siteName}</span>
                  <span className="font-mono text-xs text-neutral-500">{u.calls} llamadas</span>
                  {u.failures > 0 ? (
                    <span className="font-mono text-xs text-red-600">{u.failures} con error</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
