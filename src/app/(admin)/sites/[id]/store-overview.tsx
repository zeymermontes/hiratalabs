import Link from "next/link";
import type { Site } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { siteHost } from "@/lib/host";
import { listSiteModules } from "@/lib/modules";
import { TEMPLATE_BY_KEY } from "@/lib/theme";
import { MetaForm } from "./meta-form";
import { getSiteSettings } from "@/lib/settings";

/**
 * Resumen de una tienda: pasos de puesta en marcha y accesos a los módulos.
 * Las cifras de ventas llegan con el módulo de pedidos.
 */
export async function StoreOverview({ site }: { site: Site }) {
  const [mods, settings] = await Promise.all([listSiteModules(site), getSiteSettings(site.id)]);
  const enabled = mods.filter((m) => m.enabled);
  const template = TEMPLATE_BY_KEY[site.theme?.template ?? "lumen"];
  const host = siteHost(site.slug, env.rootDomain);

  const steps = [
    { done: Boolean(settings.brandName || settings.whatsapp || settings.email), label: "Datos de contacto", href: `/sites/${site.id}/settings` },
    { done: Boolean(site.theme?.colors || site.theme?.logoUrl), label: "Diseño y marca", href: `/sites/${site.id}/design` },
    { done: false, label: "Primer producto", href: `/sites/${site.id}/products` },
    { done: false, label: "Pagos (Mercado Pago)", href: `/sites/${site.id}/settings` },
    { done: site.status === "live", label: "Publicar la tienda", href: `/sites/${site.id}` },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-8">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Tu tienda está al {Math.round((doneCount / steps.length) * 100)}%</h2>
            <p className="hint mt-0.5">{doneCount} de {steps.length} pasos listos · plantilla <strong>{template?.name ?? "Lumen"}</strong></p>
          </div>
          <a href={`https://${host}`} target="_blank" rel="noreferrer" className="btn-secondary">Ver tienda ↗</a>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <ol className="mt-4 flex flex-wrap gap-2">
          {steps.map((s) => (
            <li key={s.label}>
              <Link
                href={s.href}
                className={`pill min-h-9 ${s.done ? "bg-emerald-50 text-emerald-700" : "bg-purple text-white"}`}
              >
                {s.done ? "✓ " : ""}{s.label}{s.done ? "" : " →"}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Módulos activos</h2>
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {enabled.map((m) => (
            <Link
              key={m.def.key}
              href={m.def.adminTab ? `/sites/${site.id}${m.def.adminTab.href}` : `/sites/${site.id}/modules`}
              className="card flex min-h-20 flex-col justify-center gap-1 p-4 transition hover:border-purple"
            >
              <span className="text-sm font-semibold text-neutral-900">{m.def.name}</span>
              <span className="hint">{m.def.description}</span>
            </Link>
          ))}
          <Link href={`/sites/${site.id}/modules`} className="card flex min-h-20 items-center justify-center border-dashed p-4 text-sm font-semibold text-purple hover:bg-purple-tint">
            + Agregar módulos
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Ajustes del sitio</h2>
        <MetaForm site={site} rootDomain={env.rootDomain} />
      </section>
    </div>
  );
}
