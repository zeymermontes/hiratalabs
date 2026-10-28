"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMXN } from "@/components/storefront/money";

export type CartVariant = { id: string; name: string; priceDeltaCents: number; stock: number | null };
export type CartField = {
  id: string;
  type: "text" | "textarea" | "number" | "dropdown" | "file";
  name: string;
  label: string;
  required: boolean;
  options: { value: string; label: string; priceDeltaCents?: number }[] | null;
  variantIds: string[] | null;
};

type Props = {
  productId: string;
  productName: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number | null;
  variants: CartVariant[];
  fields: CartField[];
  requiresFile: boolean;
  /** Módulo pedidos activo: hay carrito. Si no, se pide por WhatsApp. */
  ordersEnabled: boolean;
  whatsappHref: string;
  productUrl: string;
};

/**
 * Caja de compra: opción, campos de personalización, cantidad y el botón.
 * Manda { productId, variantId?, quantity, customization? } a
 * POST /api/store/cart/items y espera { ok: true, count }.
 */
export function AddToCart({
  productId, productName, priceCents, compareAtCents, stock, variants, fields, requiresFile, ordersEnabled, whatsappHref, productUrl,
}: Props) {
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const visibleFields = useMemo(
    () => fields.filter((f) => !f.variantIds?.length || (variantId && f.variantIds.includes(variantId))),
    [fields, variantId],
  );
  const available = variant ? variant.stock : stock;
  const soldOut = available !== null && available <= 0;
  const maxQty = available === null ? 99 : Math.max(1, available);

  const extraCents = visibleFields.reduce((sum, f) => {
    if (f.type !== "dropdown" || !f.options) return sum;
    const opt = f.options.find((o) => o.value === values[f.name]);
    return sum + (opt?.priceDeltaCents ?? 0);
  }, 0);
  const unitCents = Math.max(0, priceCents + (variant?.priceDeltaCents ?? 0) + extraCents);
  const onSale = compareAtCents !== null && compareAtCents > priceCents;

  function validate(): string | null {
    for (const f of visibleFields) {
      if (f.type === "file") continue;
      if (f.required && !String(values[f.name] ?? "").trim()) return `Falta: ${f.label}.`;
    }
    if (soldOut) return "Este producto está agotado.";
    return null;
  }

  async function add() {
    const v = validate();
    if (v) { setError(v); setState("error"); return; }
    setError(null);
    setState("sending");
    const customization: Record<string, string> = {};
    for (const f of visibleFields) {
      if (f.type === "file") continue;
      const val = String(values[f.name] ?? "").trim();
      if (val) customization[f.name] = val;
    }
    try {
      const res = await fetch("/api/store/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          productId,
          variantId: variantId ?? undefined,
          quantity: qty,
          customization: Object.keys(customization).length ? customization : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; count?: number; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "No se pudo agregar. Intenta de nuevo.");
        setState("error");
        return;
      }
      setCount(typeof data.count === "number" ? data.count : null);
      setState("ok");
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
      setState("error");
    }
  }

  const whatsappMsg = (() => {
    const lines = [`Hola, quiero pedir: ${productName}`];
    if (variant) lines.push(`Opción: ${variant.name}`);
    lines.push(`Cantidad: ${qty}`);
    for (const f of visibleFields) if (values[f.name]) lines.push(`${f.label}: ${values[f.name]}`);
    lines.push(productUrl);
    return encodeURIComponent(lines.join("\n"));
  })();

  return (
    <div className="sf-buybox">
      <div className="sf-product-price">
        <span>{formatMXN(unitCents)}</span>
        {onSale ? <span className="sf-compare">{formatMXN(compareAtCents!)}</span> : null}
      </div>

      {variants.length > 0 ? (
        <div className="sf-field">
          <span className="sf-field-label">Opción</span>
          <div className="sf-options" role="group" aria-label="Opción">
            {variants.map((v) => {
              const out = v.stock !== null && v.stock <= 0;
              return (
                <button
                  key={v.id} type="button" className="sf-option" aria-pressed={variantId === v.id} disabled={out}
                  onClick={() => { setVariantId(v.id); setQty(1); setState("idle"); }}
                >
                  {v.name}
                  {v.priceDeltaCents !== 0 ? <small>{v.priceDeltaCents > 0 ? "+" : "−"}{formatMXN(Math.abs(v.priceDeltaCents))}</small> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {visibleFields.map((f) => (
        <label key={f.id} className="sf-field">
          <span>{f.label} {f.required ? <span className="sf-field-req" aria-hidden="true">*</span> : null}</span>
          {f.type === "textarea" ? (
            <textarea className="sf-input" rows={3} required={f.required} value={values[f.name] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))} />
          ) : f.type === "dropdown" ? (
            <select className="sf-input" required={f.required} value={values[f.name] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}>
              <option value="">Elige…</option>
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}{o.priceDeltaCents ? ` (+${formatMXN(o.priceDeltaCents)})` : ""}
                </option>
              ))}
            </select>
          ) : f.type === "file" ? (
            <p className="sf-note">Te pediremos este archivo al confirmar el pedido.</p>
          ) : (
            <input className="sf-input" type={f.type === "number" ? "number" : "text"} required={f.required} value={values[f.name] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))} />
          )}
        </label>
      ))}
      {requiresFile && !visibleFields.some((f) => f.type === "file") ? (
        <p className="sf-note">Este producto lleva tu diseño: te pediremos el archivo al confirmar el pedido.</p>
      ) : null}

      <div className="sf-field">
        <span className="sf-field-label">Cantidad</span>
        <div className="sf-buy-row">
          <div className="sf-qty">
            <button type="button" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <input type="number" min={1} max={maxQty} value={qty} aria-label="Cantidad" onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))} />
            <button type="button" aria-label="Más" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
          </div>
          {available !== null ? (
            <span className={`sf-stock ${soldOut ? "sf-stock-out" : available <= 5 ? "sf-stock-low" : ""}`}>
              {soldOut ? "Agotado" : available <= 5 ? `Quedan ${available}` : "Disponible"}
            </span>
          ) : null}
        </div>
      </div>

      {qty > 1 ? (
        <div className="sf-total"><span>Total ({qty})</span><strong>{formatMXN(unitCents * qty)}</strong></div>
      ) : null}

      {ordersEnabled ? (
        state === "ok" ? (
          <div className="sf-ok">
            <span>Agregado{count ? ` · ${count} en tu carrito` : ""}</span>
            <Link href="/carrito" className="sf-btn sf-btn-primary">Ver carrito</Link>
            <button type="button" className="sf-btn sf-btn-ghost" onClick={() => setState("idle")}>Seguir comprando</button>
          </div>
        ) : (
          <div className="sf-buy-row">
            <button type="button" className="sf-btn sf-btn-primary" disabled={state === "sending" || soldOut} onClick={() => void add()}>
              {soldOut ? "Agotado" : state === "sending" ? "Agregando…" : "Agregar al carrito"}
            </button>
          </div>
        )
      ) : whatsappHref ? (
        <a className="sf-btn sf-btn-primary" href={`${whatsappHref}?text=${whatsappMsg}`} target="_blank" rel="noreferrer">
          Pedir por WhatsApp
        </a>
      ) : (
        <Link href="/contacto" className="sf-btn sf-btn-primary">Pedir por contacto</Link>
      )}
      {state === "error" && error ? <p className="sf-error">{error}</p> : null}
    </div>
  );
}
