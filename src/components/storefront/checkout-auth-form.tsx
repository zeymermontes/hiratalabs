"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  customerLogin, customerRecover, customerSetPassword, customerSignup, customerUpdateProfile, type AuthState,
} from "@/modules/orders/customer-auth";
import { SfAlert, SfField, sfInput } from "./checkout-ui";

type Mode = "login" | "signup" | "recover" | "password" | "profile";

const ACTIONS: Record<Mode, (prev: AuthState | undefined, form: FormData) => Promise<AuthState>> = {
  login: customerLogin, signup: customerSignup, recover: customerRecover, password: customerSetPassword, profile: customerUpdateProfile,
};

const LABEL: Record<Mode, string> = {
  login: "Entrar", signup: "Crear cuenta", recover: "Enviar correo", password: "Guardar contraseña", profile: "Guardar",
};

/** Formularios de cuenta del comprador (login, registro, recuperar, nueva contraseña, perfil). */
export function AuthForm({ mode, next, defaults }: { mode: Mode; next?: string; defaults?: { fullName?: string; phone?: string } }) {
  const [state, action, pending] = useActionState<AuthState | undefined, FormData>(ACTIONS[mode], undefined);
  const e = state?.errors ?? {};

  if (state?.ok && (mode === "signup" || mode === "recover")) {
    return <SfAlert tone="ok">{state.message}</SfAlert>;
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {mode === "signup" || mode === "profile" ? (
        <>
          <SfField label="Nombre completo" error={e.fullName}>
            <input name="fullName" required autoComplete="name" defaultValue={defaults?.fullName ?? ""} style={sfInput} />
          </SfField>
          <SfField label="Teléfono" error={e.phone} hint={mode === "signup" ? "Opcional. Para avisarte de tu pedido." : undefined}>
            <input name="phone" inputMode="tel" autoComplete="tel" defaultValue={defaults?.phone ?? ""} style={sfInput} />
          </SfField>
        </>
      ) : null}

      {mode === "login" || mode === "signup" || mode === "recover" ? (
        <SfField label="Correo" error={e.email}>
          <input name="email" type="email" required autoComplete="email" style={sfInput} />
        </SfField>
      ) : null}

      {mode === "login" || mode === "signup" || mode === "password" ? (
        <SfField label={mode === "password" ? "Nueva contraseña" : "Contraseña"} error={e.password} hint={mode !== "login" ? "Mínimo 8 caracteres, con una letra y un número." : undefined}>
          <input name="password" type="password" required minLength={mode === "login" ? 6 : 8} autoComplete={mode === "login" ? "current-password" : "new-password"} style={sfInput} />
        </SfField>
      ) : null}

      {mode === "password" ? (
        <SfField label="Repite la contraseña" error={e.confirm}>
          <input name="confirm" type="password" required autoComplete="new-password" style={sfInput} />
        </SfField>
      ) : null}

      {state?.message ? <SfAlert tone={state.ok ? "ok" : "error"}>{state.message}</SfAlert> : null}

      <button type="submit" className="sf-btn sf-btn-primary" disabled={pending}>
        {pending ? "Un momento…" : LABEL[mode]}
      </button>

      {mode === "login" ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 14 }}>
          <Link href={`/cuenta/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="sf-link">Crear una cuenta</Link>
          <Link href="/cuenta/recuperar" className="sf-link">Olvidé mi contraseña</Link>
        </div>
      ) : mode === "signup" ? (
        <p style={{ margin: 0, fontSize: 14, textAlign: "center" }}>
          ¿Ya tienes cuenta? <Link href={`/cuenta/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="sf-link" style={{ minHeight: 0 }}>Entra</Link>
        </p>
      ) : mode === "recover" ? (
        <p style={{ margin: 0, fontSize: 14, textAlign: "center" }}>
          <Link href="/cuenta/login" className="sf-link" style={{ minHeight: 0 }}>Volver a entrar</Link>
        </p>
      ) : null}
    </form>
  );
}
