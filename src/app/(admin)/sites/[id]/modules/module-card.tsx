"use client";

import { useState, useTransition } from "react";
import { requestModule, toggleSiteModule } from "@/app/(admin)/module-actions";
import { TierPill } from "@/components/ui";

type Props = {
  siteId: string;
  moduleKey: string;
  name: string;
  description: string;
  tier: "free" | "paid";
  priceLabel: string | null;
  enabled: boolean;
  core: boolean;
  available: boolean;
  pendingRequest: boolean;
  missing: string[];
  canToggle: boolean;
  canRequest: boolean;
};

export function ModuleCard(p: Props) {
  const [enabled, setEnabled] = useState(p.enabled);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [requested, setRequested] = useState(p.pendingRequest);

  function toggle() {
    const next = !enabled;
    setErr(null); setMsg(null);
    start(async () => {
      const r = await toggleSiteModule(p.siteId, p.moduleKey, next);
      if (r.error) setErr(r.error);
      else { setEnabled(next); setMsg(r.message ?? null); }
    });
  }

  function ask() {
    setErr(null); setMsg(null);
    start(async () => {
      const r = await requestModule(p.siteId, p.moduleKey, note);
      if (r.error) setErr(r.error);
      else { setRequested(true); setAsking(false); setMsg(r.message ?? null); }
    });
  }

  return (
    <div className={`card flex flex-col gap-3 p-4 ${!p.available ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900">{p.name}</span>
            <TierPill tier={p.tier} priceLabel={p.priceLabel} />
            {p.core ? <span className="pill bg-neutral-100 text-neutral-600">Incluido</span> : null}
            {!p.available ? <span className="pill bg-red-50 text-red-700">Retirado del catálogo</span> : null}
          </div>
          <p className="hint mt-1">{p.description}</p>
        </div>

        {p.core ? (
          <span className="pill shrink-0 bg-emerald-50 text-emerald-700">Activo</span>
        ) : p.canToggle ? (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? "Desactivar" : "Activar"} ${p.name}`}
            disabled={pending}
            onClick={toggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-purple" : "bg-neutral-300"} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        ) : enabled ? (
          <span className="pill shrink-0 bg-emerald-50 text-emerald-700">Activo</span>
        ) : (
          <span className="pill shrink-0 bg-neutral-100 text-neutral-600">Inactivo</span>
        )}
      </div>

      {p.missing.length > 0 && !enabled ? (
        <p className="text-xs text-amber-700">Requiere activar antes: {p.missing.join(", ")}.</p>
      ) : null}

      {p.canRequest ? (
        requested ? (
          <p className="text-xs font-semibold text-purple">Solicitud enviada · te avisamos cuando esté activo.</p>
        ) : asking ? (
          <div className="space-y-2">
            <label className="label" htmlFor={`note-${p.moduleKey}`}>¿Algo que debamos saber?</label>
            <textarea
              id={`note-${p.moduleKey}`} value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} className="input" placeholder="Opcional"
            />
            <div className="flex gap-2">
              <button type="button" onClick={ask} disabled={pending} className="btn-primary">
                {pending ? "Enviando…" : "Enviar solicitud"}
              </button>
              <button type="button" onClick={() => setAsking(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        ) : (
          <div>
            <button type="button" onClick={() => setAsking(true)} className="btn-secondary">
              Solicitar este extra
            </button>
          </div>
        )
      ) : null}

      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {msg ? <p className="text-xs text-emerald-700">{msg}</p> : null}
    </div>
  );
}
