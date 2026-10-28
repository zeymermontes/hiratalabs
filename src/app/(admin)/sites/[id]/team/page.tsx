import { asc, eq } from "drizzle-orm";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteMembers } from "@/lib/db/schema";
import { formatDate } from "@/lib/reports";
import { Empty } from "@/components/ui";
import { AddMemberForm, RemoveMemberButton } from "./team-forms";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { owner: "Dueño", staff: "Staff" } as const;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireSiteAccess(id, { manage: true });
  const rows = await db.select().from(siteMembers).where(eq(siteMembers.siteId, id)).orderBy(asc(siteMembers.createdAt));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h2 className="mb-1 text-sm font-semibold text-neutral-900">Quién entra a este panel</h2>
        <p className="hint mb-3 max-w-xl">
          Entran con su correo, sin contraseña. El <strong>dueño</strong> administra todo lo del sitio
          (ajustes, módulos, equipo). El <strong>staff</strong> opera: pedidos, productos, mensajes.
        </p>
        {rows.length === 0 ? (
          <Empty title="Sin miembros" body="Solo el equipo de Hirata Labs ve este sitio por ahora. Invita al dueño con su correo." />
        ) : (
          <div className="card divide-y divide-neutral-200">
            {rows.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{m.name || m.email}</span>
                    <span className={`pill ${m.role === "owner" ? "bg-purple-tint text-purple-dark" : "bg-neutral-100 text-neutral-600"}`}>
                      {ROLE_LABEL[m.role]}
                    </span>
                    {!m.userId ? <span className="pill bg-amber-50 text-amber-700">Aún no entra</span> : null}
                  </div>
                  <p className="hint mt-0.5 font-mono">{m.email} · desde {formatDate(m.createdAt)}</p>
                </div>
                {access.isSuperAdmin || m.email !== access.user.email ? (
                  <RemoveMemberButton siteId={id} memberId={m.id} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
      <aside>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Invitar</h2>
        <AddMemberForm siteId={id} />
      </aside>
    </div>
  );
}
