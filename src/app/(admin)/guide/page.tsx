import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { buildGuide } from "@/lib/guide";
import { getGlobalSettings, SOCIAL_KEYS } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const [global, recent] = await Promise.all([
    getGlobalSettings(),
    db.select({ slug: sites.slug }).from(sites).orderBy(desc(sites.updatedAt)).limit(1),
  ]);

  const guide = buildGuide({
    rootDomain: env.rootDomain,
    socialKeys: SOCIAL_KEYS,
    customKeys: Object.keys(global?.custom ?? {}),
    exampleSlug: recent[0]?.slug ?? "cliente",
  });

  return (
    <>
      <PageHeader
        title="Guía para IA"
        subtitle="Pégasela a Claude, Cursor o quien construya la landing. Explica el contrato exacto para que el ZIP lea los datos del panel."
        actions={<CopyButton text={guide} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { t: "1. Copia la guía", d: "El botón de arriba copia todo el documento al portapapeles." },
          { t: "2. Pégala en tu IA", d: "Antes de pedirle la landing. Es el contrato completo." },
          { t: "3. Sube el ZIP", d: "El panel inyecta contacto y formularios automáticamente." },
        ].map((s) => (
          <div key={s.t} className="card p-4">
            <p className="text-sm font-medium text-neutral-900">{s.t}</p>
            <p className="hint mt-1">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
          <span className="text-xs font-medium text-neutral-500">guia-landing.md</span>
          <CopyButton text={guide} label="Copiar" />
        </div>
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-relaxed text-neutral-800">
{guide}
        </pre>
      </div>
    </>
  );
}
