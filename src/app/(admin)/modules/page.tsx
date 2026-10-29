import { requireAdmin } from "@/lib/auth";
import { listCatalog } from "@/lib/modules";
import { MODULE_CATEGORY_LABEL, type ModuleCategory } from "@/modules/registry";
import { PageHeader } from "@/components/ui";
import { CatalogRow } from "./catalog-row";

export const dynamic = "force-dynamic";

const ORDER: ModuleCategory[] = ["base", "ventas", "contenido", "marketing", "operacion", "ia", "a-la-medida"];

export default async function ModulesCatalogPage() {
  await requireAdmin();
  const list = await listCatalog();

  return (
    <>
      <PageHeader
        title="Módulos"
        subtitle="Qué se incluye gratis, qué se vende como extra y qué puede prender cada dueño por su cuenta. Lo que no cambies usa el default del código."
      />
      <div className="space-y-8">
        {ORDER.map((cat) => {
          const items = list.filter((m) => m.def.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {MODULE_CATEGORY_LABEL[cat]}
              </h2>
              <div className="card divide-y divide-neutral-200">
                {items.map((m) => (
                  <CatalogRow
                    key={m.def.key}
                    moduleKey={m.def.key}
                    name={m.def.name}
                    description={m.def.description}
                    appliesTo={m.def.appliesTo}
                    core={Boolean(m.def.core)}
                    available={m.available}
                    tier={m.tier}
                    priceLabel={m.priceLabel}
                    ownerCanToggle={m.ownerCanToggle}
                    notes={m.notes}
                    customized={m.customized}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
