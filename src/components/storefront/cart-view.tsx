"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatMXN } from "@/components/storefront/money";
import type { CartLine } from "@/modules/orders/cart";
import { SfAlert, SfRow } from "./checkout-ui";

/**
 * Carrito interactivo. Cada cambio llama a /api/store/cart/items y refresca
 * la página (server) para que totales y badge del header queden en sincronía.
 */
export function CartView({ items, subtotalCents, checkoutEnabled }: { items: CartLine[]; subtotalCents: number; checkoutEnabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body: Record<string, unknown>, itemId: string) {
    setBusy(itemId);
    setError(null);
    try {
      const res = await fetch("/api/store/cart/items", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) setError(data.error ?? "No se pudo actualizar el carrito.");
      start(() => router.refresh());
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  const blocked = items.some((i) => i.unavailable || (i.available !== null && i.quantity > i.available));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
      <ul style={{ flex: "1 1 420px", minWidth: 0, listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
        {items.map((i) => {
          const over = i.available !== null && i.quantity > i.available;
          const maxed = i.available !== null && i.quantity >= i.available;
          return (
            <li key={i.id} style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: "1px solid var(--sf-muted)", opacity: busy === i.id || pending ? 0.6 : 1 }}>
              <Link href={`/productos/${i.slug}`} style={{ width: 84, height: 84, flexShrink: 0, borderRadius: "var(--sf-radius)", background: "var(--sf-muted)", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.imageUrl ? <img src={i.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </Link>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/productos/${i.slug}`} style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</Link>
                    {i.variantName ? <div className="sf-muted" style={{ fontSize: 13 }}>{i.variantName}</div> : null}
                    {i.customization ? (
                      <div className="sf-muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {Object.entries(i.customization).filter(([k, v]) => !k.startsWith("_") && typeof v !== "object").slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                      </div>
                    ) : null}
                  </div>
                  <div className="sf-price" style={{ whiteSpace: "nowrap" }}>{formatMXN(i.lineTotalCents)}</div>
                </div>
                {i.unavailable ? (
                  <span style={{ color: "#d23b3b", fontSize: 13, fontWeight: 700 }}>Ya no está disponible</span>
                ) : over ? (
                  <span style={{ color: "#d23b3b", fontSize: 13, fontWeight: 700 }}>Solo quedan {i.available}. Baja la cantidad.</span>
                ) : null}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div role="group" aria-label={`Cantidad de ${i.name}`} style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--sf-muted)", borderRadius: 999 }}>
                    <button type="button" className="sf-iconbtn" aria-label="Quitar uno" disabled={busy !== null} onClick={() => call("PATCH", { itemId: i.id, quantity: i.quantity - 1 }, i.id)}>−</button>
                    <span style={{ minWidth: 28, textAlign: "center", fontWeight: 800 }}>{i.quantity}</span>
                    <button type="button" className="sf-iconbtn" aria-label="Agregar uno" disabled={busy !== null || maxed || i.unavailable} onClick={() => call("PATCH", { itemId: i.id, quantity: i.quantity + 1 }, i.id)}>+</button>
                  </div>
                  <span className="sf-muted" style={{ fontSize: 13 }}>{formatMXN(i.unitPriceCents)} c/u</span>
                  <button type="button" onClick={() => call("DELETE", { itemId: i.id }, i.id)} disabled={busy !== null} style={{ marginLeft: "auto", background: "none", border: 0, color: "inherit", opacity: 0.7, cursor: "pointer", fontSize: 13, fontWeight: 700, minHeight: 44, padding: "0 6px" }}>
                    Quitar
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside style={{ flex: "0 1 340px", width: "100%", border: "1px solid var(--sf-muted)", borderRadius: "calc(var(--sf-radius) + 4px)", padding: 20, display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 84 }}>
        <h2 style={{ fontSize: 22 }}>Resumen</h2>
        {error ? <SfAlert>{error}</SfAlert> : null}
        <SfRow label="Subtotal" value={formatMXN(subtotalCents)} />
        <p className="sf-muted" style={{ fontSize: 13, margin: 0 }}>El envío se calcula en el siguiente paso.</p>
        {checkoutEnabled ? (
          blocked ? (
            <span className="sf-btn sf-btn-primary" aria-disabled="true" style={{ opacity: 0.5, pointerEvents: "none" }}>Revisa tu carrito</span>
          ) : (
            <Link href="/checkout" className="sf-btn sf-btn-primary">Continuar a la compra</Link>
          )
        ) : (
          <SfAlert tone="info">Por ahora esta tienda no recibe pagos en línea. Escríbenos para completar tu compra.</SfAlert>
        )}
        <Link href="/productos" className="sf-link" style={{ justifyContent: "center" }}>Seguir comprando</Link>
      </aside>
    </div>
  );
}
