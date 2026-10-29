import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiKeys, aiModels, sites } from "@/lib/db/schema";
import { isModuleEnabled } from "@/lib/modules";
import { ASSIST_MODULE_KEY, DEFAULT_MONTHLY_TOKENS, getAssistConfig, getAssistUsage } from "@/modules/ai/assist";
import { AssistSettingsForm } from "./assist-settings-form";
import { Playground } from "./playground";

export const dynamic = "force-dynamic";

const USES: { where: string; what: string }[] = [
  { where: "Productos", what: "Descripción, puntos clave y textos SEO a partir del nombre y unas notas." },
  { where: "Diseño › Portada", what: "Frase principal e introducción de la tienda según a qué te dedicas." },
  { where: "Mensajes", what: "Borrador de respuesta a lo que te escriben por el formulario." },
  { where: "FAQ", what: "Respuestas a preguntas frecuentes con el contexto de tu negocio." },
  { where: "Donde haya texto", what: "Traducción español ↔ inglés conservando el formato." },
];

export default async function SiteAiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id);
  const [site] = await db.select().from(sites).where(eq(sites.id, id));
  if (!site) notFound();

  const enabled = await isModuleEnabled(site, ASSIST_MODULE_KEY);
  const cfg = await getAssistConfig(id);
  const [usage, keys, models] = await Promise.all([
    getAssistUsage(id, cfg),
    db.select({ provider: aiKeys.provider }).from(aiKeys),
    db.select({ provider: aiModels.provider, model: aiModels.model }).from(aiModels).where(eq(aiModels.isDefault, true)),
  ]);

  const quota = usage.quota;
  const pct = quota ? Math.min(100, Math.round((usage.usedTokens / quota) * 100)) : 0;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-purple";
  const defaultModels = Object.fromEntries(models.map((m) => [m.provider, m.model]));

  return (
    <div className="space-y-6">
      {!enabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          El Asistente de IA está apagado en este sitio. Los botones "Redactar con IA" no van a funcionar hasta que
          lo actives en <Link href={`/sites/${id}/modules`} className="font-medium underline">Módulos</Link>.
        </p>
      ) : null}

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-900">Consumo de este mes</h3>
          <span className="text-sm text-neutral-600">
            {usage.keyMode === "own" ? (
              <>
                <strong className="text-neutral-900">{usage.usedTokens.toLocaleString("es-MX")}</strong> tokens · con tu
                propia llave, sin límite
              </>
            ) : (
              <>
                <strong className="text-neutral-900">{usage.usedTokens.toLocaleString("es-MX")}</strong> de{" "}
                {(quota ?? 0).toLocaleString("es-MX")} tokens
              </>
            )}
            {" "}· {usage.calls} {usage.calls === 1 ? "texto" : "textos"}
          </span>
        </div>
        {usage.keyMode === "platform" ? (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="hint mt-2">
              {pct >= 100
                ? "Cuota agotada. Se reinicia el día 1, o conecta tu propia llave para seguir sin límite."
                : "Un texto típico gasta entre 500 y 1,500 tokens. La cuota se reinicia el día 1 de cada mes."}
            </p>
          </>
        ) : null}
      </section>

      {enabled ? <Playground siteId={id} /> : null}

      <section className="card p-5">
        <h3 className="text-sm font-semibold text-neutral-900">Qué hace y dónde aparece</h3>
        <p className="hint mt-0.5">
          Busca el botón morado <strong>Redactar con IA</strong> junto a los campos de texto del panel. Lo que genera
          se pone en el campo para que lo revises y edites antes de guardar: la IA propone, tú decides.
        </p>
        <ul className="mt-3 divide-y divide-neutral-100 text-sm">
          {USES.map((u) => (
            <li key={u.where} className="flex gap-3 py-2">
              <span className="w-36 shrink-0 font-medium text-neutral-800">{u.where}</span>
              <span className="text-neutral-600">{u.what}</span>
            </li>
          ))}
        </ul>
      </section>

      {access.canManage ? (
        <AssistSettingsForm
          siteId={id}
          isSuperAdmin={access.isSuperAdmin}
          platformProviders={Array.from(new Set(keys.map((k) => k.provider)))}
          defaultModels={defaultModels}
          values={{
            keyMode: cfg.keyMode ?? "platform",
            provider: cfg.provider ?? "deepseek",
            model: cfg.model ?? "",
            ownHint: cfg.ownHint ?? null,
            monthlyTokens: cfg.monthlyTokens ?? DEFAULT_MONTHLY_TOKENS,
          }}
        />
      ) : (
        <p className="hint">Los ajustes de llave y modelo los cambia el dueño del sitio.</p>
      )}
    </div>
  );
}
