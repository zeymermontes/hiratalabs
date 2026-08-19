export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    draft: "bg-neutral-100 text-neutral-600 ring-neutral-200",
    maintenance: "bg-amber-50 text-amber-700 ring-amber-200",
    blocked: "bg-red-50 text-red-700 ring-red-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
    sent: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    skipped: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  };
  const label: Record<string, string> = {
    live: "En línea", draft: "Borrador", maintenance: "Mantenimiento", blocked: "Bloqueado",
    pending: "Pendiente", verified: "Verificado", failed: "Falló", sent: "Enviado", skipped: "Sin envío",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-neutral-500">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium text-neutral-800">{title}</p>
      <p className="max-w-sm text-sm text-neutral-500">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint ? <p className="hint mt-1">{hint}</p> : null}
    </div>
  );
}
