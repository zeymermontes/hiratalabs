"use client";

import { useEffect, useState } from "react";

const UNITS = [
  { key: "d", label: "días", short: "d" },
  { key: "h", label: "horas", short: "h" },
  { key: "m", label: "minutos", short: "min" },
  { key: "s", label: "segundos", short: "s" },
] as const;

function split(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/**
 * Reloj que corre en el navegador. En el servidor (y en el primer render)
 * pinta guiones para no chocar con la hidratación; arranca al montarse.
 */
export function CountdownTimer({ target, variant, button }: { target: number; variant: "boxes" | "inline"; button: React.ReactNode }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const done = now !== null && now >= target;
  if (done) {
    return (
      <div className="sf-cd-done">
        <p className="sf-cd-done-msg sf-display">¡Ya está aquí!</p>
        {button}
      </div>
    );
  }

  const parts = now === null ? null : split(target - now);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="sf-cd-timer">
      <div className="sf-cd-units" role="timer" aria-live="off" aria-label={parts ? `Faltan ${parts.d} días, ${parts.h} horas y ${parts.m} minutos` : "Cuenta regresiva"}>
        {UNITS.map((u, i) => (
          <span key={u.key} className="sf-cd-unit">
            <span className="sf-cd-num sf-display" suppressHydrationWarning>{parts ? pad(parts[u.key]) : "--"}</span>
            <span className="sf-cd-label">{variant === "inline" ? u.short : u.label}</span>
            {variant === "inline" && i < UNITS.length - 1 ? <span className="sf-cd-colon" aria-hidden="true">:</span> : null}
          </span>
        ))}
      </div>
      {button}
    </div>
  );
}
