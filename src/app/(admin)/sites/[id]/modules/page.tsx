import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { canToggle, listSiteModules } from "@/lib/modules";
import { MODULE_CATEGORY_LABEL, type ModuleCategory } from "@/modules/registry";
import { ModuleCard } from "./module-card";

export const dynamic = "force-dynamic";

const ORDER: ModuleCategory[] = ["base", "ventas", "contenido", "marketing", "operacion", "ia", "a-la-medida"];

export default async function SiteModulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id, { manage: true });
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const list = (await listSiteModules(site)).filter((m) => m.available || access.isSuperAdmin);
  const groups = ORDER
    .map((cat) => ({ cat, items: list.filter((m) => m.def.category === cat) }))
    .filter((g) => g.items.length > 0);

  const active = list.filter((m) => m.enabled).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Módulos</h2>
          <p className="hint mt-1 max-w-xl">
            {active} de {list.length} activos. Los gratuitos se prenden y apagan al instante;
            los extras se solicitan y el equipo de Hirata Labs los activa.
            {access.isSuperAdmin ? " Como super admin puedes activar cualquiera directo." : ""}
          </p>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.cat}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {MODULE_CATEGORY_LABEL[g.cat]}
          </h3>
          <div className="stagger grid gap-3 md:grid-cols-2">
            {g.items.map((m) => (
              <ModuleCard
                key={m.def.key}
                siteId={site.id}
                moduleKey={m.def.key}
                name={m.def.name}
                description={m.def.description}
                tier={m.tier}
                priceLabel={m.priceLabel}
                enabled={m.enabled}
                core={Boolean(m.def.core)}
                available={m.available}
                pendingRequest={m.pendingRequest}
                missing={m.missing}
                canToggle={canToggle(m, access)}
                canRequest={!access.isSuperAdmin && !m.enabled && !canToggle(m, access) && m.available}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
