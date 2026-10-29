import type { CSSProperties, ReactNode } from "react";

/**
 * Piezas visuales compartidas por carrito, checkout y cuenta. Solo usan
 * variables --sf-* para vestir la marca de cada tienda. Sin dependencias de
 * cliente: sirven igual en server y client components.
 */

export const sfInput: CSSProperties = {
  width: "100%", minHeight: 48, padding: "10px 14px", borderRadius: "var(--sf-radius)",
  border: "1px solid var(--sf-muted)", background: "var(--sf-bg)", color: "var(--sf-fg)",
  fontFamily: "inherit", fontSize: 16, boxSizing: "border-box",
};

export const sfPanel: CSSProperties = {
  border: "1px solid var(--sf-muted)", borderRadius: "calc(var(--sf-radius) + 4px)", padding: 20,
  display: "flex", flexDirection: "column", gap: 14, background: "var(--sf-bg)",
};

export const MX_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México",
  "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán",
  "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa",
  "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

export function SfField({ label, error, hint, children, style }: { label: string; error?: string; hint?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, ...style }}>
      {label}
      {children}
      {error ? <span style={{ color: "#d23b3b", fontWeight: 600, fontSize: 12 }}>{error}</span> : null}
      {!error && hint ? <span className="sf-muted" style={{ fontWeight: 500, fontSize: 12 }}>{hint}</span> : null}
    </label>
  );
}

export function SfAlert({ tone = "error", children }: { tone?: "error" | "ok" | "info"; children: ReactNode }) {
  const color = tone === "error" ? "#d23b3b" : tone === "ok" ? "#1f7a3f" : "var(--sf-fg)";
  const bg = tone === "error" ? "rgba(210,59,59,.08)" : tone === "ok" ? "rgba(31,122,63,.08)" : "var(--sf-muted)";
  return (
    <div role={tone === "error" ? "alert" : "status"} style={{ background: bg, color, borderRadius: "var(--sf-radius)", padding: "12px 14px", fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
      {children}
    </div>
  );
}

export function SfPageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
      <h1 style={{ fontSize: 34, marginTop: eyebrow ? 8 : 0 }}>{title}</h1>
      {children ? <div className="sf-muted" style={{ marginTop: 6, fontSize: 15 }}>{children}</div> : null}
    </div>
  );
}

export function SfRow({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: strong ? 18 : 14, fontWeight: strong ? 800 : 500 }}>
      <span className={strong ? undefined : "sf-muted"}>{label}</span>
      <span style={{ fontFamily: strong ? "var(--sf-font-display)" : undefined }}>{value}</span>
    </div>
  );
}

/** Lista de enlaces de "Mi cuenta". */
export function SfAccountNav({ current }: { current: string }) {
  const items = [
    { href: "/mi-cuenta", label: "Resumen" },
    { href: "/mi-cuenta/pedidos", label: "Mis pedidos" },
    { href: "/mi-cuenta/direcciones", label: "Direcciones" },
  ];
  return (
    <nav aria-label="Mi cuenta" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
      {items.map((i) => {
        const active = i.href === current;
        return (
          <a key={i.href} href={i.href} className={`sf-btn ${active ? "sf-btn-primary" : "sf-btn-ghost"}`} style={{ minHeight: 40, padding: "0 16px", fontSize: 14 }} aria-current={active ? "page" : undefined}>
            {i.label}
          </a>
        );
      })}
    </nav>
  );
}

export function SfStatusChip({ label, tone }: { label: string; tone: "pending" | "ok" | "info" | "bad" }) {
  const map = {
    pending: { bg: "rgba(201,140,0,.14)", fg: "#8a4b00" },
    ok: { bg: "rgba(31,122,63,.14)", fg: "#1f7a3f" },
    info: { bg: "var(--sf-muted)", fg: "var(--sf-fg)" },
    bad: { bg: "rgba(210,59,59,.12)", fg: "#9b1c1c" },
  }[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: map.bg, color: map.fg }}>{label}</span>;
}

export function toneFor(status: string): "pending" | "ok" | "info" | "bad" {
  if (status === "pending") return "pending";
  if (status === "paid" || status === "delivered") return "ok";
  if (status === "cancelled") return "bad";
  return "info";
}
