"use client";

import { useActionState, useState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestMagicLink, {});
  const [dismissed, setDismissed] = useState(false);

  const message = state.error ?? (dismissed ? null : initialError);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Hirata Labs" width={38} height={35} className="mb-4 h-9 w-auto" />
          <h1 className="text-lg font-semibold tracking-tight">Panel de landings</h1>
          <p className="mt-1 text-sm text-neutral-500">Te enviamos un enlace de acceso por correo.</p>
        </div>

        {state.ok ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Listo. Revisa tu correo y abre el enlace para entrar.
          </div>
        ) : (
          <form action={action} onChange={() => setDismissed(true)} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Correo</label>
              <input
                id="email" name="email" type="email" required autoFocus
                autoComplete="email" placeholder="tu@empresa.com" className="input"
              />
            </div>
            {message ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p>
            ) : null}
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
