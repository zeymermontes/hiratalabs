import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { Empty, StatusPill } from "@/components/ui";
import { DeleteSubmissionButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.siteId, id))
    .orderBy(desc(submissions.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length === 0 ? "Sin mensajes todavía." : `${rows.length} mensaje${rows.length === 1 ? "" : "s"} (máx. 200 más recientes)`}
        </p>
        {rows.length > 0 ? (
          <a href={`/api/export/${id}/submissions.csv`} className="btn-secondary">
            Descargar CSV
          </a>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Empty
          title="Aún no llegan mensajes"
          body="Cuando alguien envíe el formulario de contacto de esta landing, lo verás aquí y llegará por correo."
        />
      ) : (
        <div className="card divide-y divide-neutral-200">
          {rows.map((s) => (
            <details key={s.id} className="group">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-neutral-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">{s.name || s.email || "Sin nombre"}</span>
                    <StatusPill status={s.emailStatus} />
                    {s.formName ? <span className="text-xs text-neutral-400">{s.formName}</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {[s.email, s.phone].filter(Boolean).join(" · ")}
                    {s.message ? ` — ${s.message.slice(0, 80)}` : ""}
                  </p>
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(s.createdAt).toLocaleString("es-MX")}
                </span>
              </summary>

              <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-4">
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
                  {Object.entries(s.data).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-xs uppercase tracking-wide text-neutral-500">{k}</dt>
                      <dd className="whitespace-pre-wrap text-sm text-neutral-800">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-3 text-xs text-neutral-400">
                  <span>{s.pageUrl ?? "—"}</span>
                  <span>IP {s.ip ?? "—"}</span>
                  {s.emailError ? <span className="text-red-600">Error de envío: {s.emailError}</span> : null}
                  <span className="ml-auto">
                    <DeleteSubmissionButton siteId={id} id={s.id} />
                  </span>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
