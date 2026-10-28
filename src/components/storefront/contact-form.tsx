"use client";

import { useState } from "react";

/** Formulario que usa el mismo endpoint /api/f/submit que las landings. */
export function ContactForm({ endpoint }: { endpoint: string }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [ts] = useState(() => Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    fd.set("_form", "contacto");
    fd.set("_ts", String(ts));
    try {
      const res = await fetch(endpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return <p style={{ fontWeight: 700 }}>¡Gracias! Te respondemos muy pronto.</p>;
  }

  const field: React.CSSProperties = {
    width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: "var(--sf-radius)",
    border: "1px solid var(--sf-muted)", background: "var(--sf-bg)", color: "var(--sf-fg)",
    fontFamily: "inherit", fontSize: 15, boxSizing: "border-box",
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700 }}>
        Nombre
        <input name="nombre" required style={field} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700 }}>
        Correo o teléfono
        <input name="email" required style={field} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700 }}>
        Mensaje
        <textarea name="mensaje" rows={4} required style={field} />
      </label>
      {state === "error" ? <p style={{ color: "#d23b3b", fontSize: 13 }}>No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.</p> : null}
      <button type="submit" className="sf-btn sf-btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
