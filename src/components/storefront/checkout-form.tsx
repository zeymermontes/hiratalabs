"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatMXN } from "@/components/storefront/money";
import { createOrder, type CheckoutState } from "@/modules/orders/checkout";
import { computeShipping, type ShippingConfig } from "@/modules/orders/shipping";
import { MX_STATES, SfAlert, SfField, SfRow, sfInput, sfPanel } from "./checkout-ui";

export type CheckoutItem = { id: string; name: string; variantName: string | null; imageUrl: string | null; quantity: number; lineTotalCents: number };
export type SavedAddress = { id: string; label: string; recipient: string; street: string; extNumber: string | null; neighborhood: string | null; city: string; state: string; zip: string; isDefault: boolean };

type Props = {
  items: CheckoutItem[];
  subtotalCents: number;
  shipping: ShippingConfig;
  contact: { email: string; fullName: string; phone: string };
  loggedIn: boolean;
  customersEnabled: boolean;
  addresses: SavedAddress[];
};

/**
 * Checkout en una sola página: contacto → entrega → resumen → "Continuar al
 * pago". El servidor recalcula todo al crear el pedido; aquí solo se previsualiza.
 */
export function CheckoutForm({ items, subtotalCents, shipping, contact, loggedIn, customersEnabled, addresses }: Props) {
  const [state, action, pending] = useActionState<CheckoutState | undefined, FormData>(createOrder, undefined);
  const [fulfillment, setFulfillment] = useState<"ship" | "pickup">("ship");
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddr?.id ?? "new");

  const shippingCents = computeShipping(shipping, subtotalCents, fulfillment);
  const totalCents = subtotalCents + shippingCents;
  const errors = state?.errors ?? {};
  const freeHint = shipping.freeOverCents !== null && fulfillment === "ship" && shippingCents > 0
    ? `Envío gratis a partir de ${formatMXN(shipping.freeOverCents)}.` : null;

  return (
    <form action={action} style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 440px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
        {/* 1. Contacto */}
        <section style={sfPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 22 }}>1. Tus datos</h2>
            {customersEnabled && !loggedIn ? (
              <Link href="/cuenta/login?next=%2Fcheckout" className="sf-link" style={{ minHeight: 0 }}>¿Ya tienes cuenta? Entra</Link>
            ) : null}
          </div>
          <SfField label="Correo" error={errors.email} hint="Ahí te mandamos la confirmación.">
            <input name="email" type="email" required autoComplete="email" defaultValue={contact.email} style={sfInput} readOnly={loggedIn && Boolean(contact.email)} />
          </SfField>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <SfField label="Nombre completo" error={errors.fullName}>
              <input name="fullName" required autoComplete="name" defaultValue={contact.fullName} style={sfInput} />
            </SfField>
            <SfField label="Teléfono" error={errors.phone}>
              <input name="phone" required autoComplete="tel" inputMode="tel" defaultValue={contact.phone} style={sfInput} />
            </SfField>
          </div>
        </section>

        {/* 2. Entrega */}
        <section style={sfPanel}>
          <h2 style={{ fontSize: 22 }}>2. ¿Cómo lo recibes?</h2>
          <input type="hidden" name="fulfillment" value={fulfillment} />
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: shipping.pickupEnabled ? "repeat(auto-fit, minmax(180px, 1fr))" : "1fr" }}>
            <Choice selected={fulfillment === "ship"} onClick={() => setFulfillment("ship")} title="Envío a domicilio"
              text={`${computeShipping(shipping, subtotalCents, "ship") === 0 ? "Gratis" : formatMXN(shipping.flatCents)}${shipping.estimatedDays ? ` · ${shipping.estimatedDays}` : ""}`} />
            {shipping.pickupEnabled ? (
              <Choice selected={fulfillment === "pickup"} onClick={() => setFulfillment("pickup")} title="Recoger en tienda" text="Sin costo. Te avisamos cuando esté listo." />
            ) : null}
          </div>

          {fulfillment === "pickup" ? (
            shipping.pickupNote ? <SfAlert tone="info">{shipping.pickupNote}</SfAlert> : null
          ) : (
            <>
              {addresses.length > 0 ? (
                <SfField label="Dirección de envío">
                  <select name="addressId" value={addressId} onChange={(e) => setAddressId(e.target.value)} style={sfInput}>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>{a.label} — {a.street} {a.extNumber ?? ""}, {a.zip} {a.city}</option>
                    ))}
                    <option value="new">Otra dirección…</option>
                  </select>
                </SfField>
              ) : <input type="hidden" name="addressId" value="new" />}

              {addressId === "new" ? (
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  <SfField label="Quién recibe" error={errors.recipient} style={{ gridColumn: "1 / -1" }}>
                    <input name="recipient" autoComplete="shipping name" defaultValue={contact.fullName} style={sfInput} />
                  </SfField>
                  <SfField label="Calle" error={errors.street} style={{ gridColumn: "1 / -1" }}>
                    <input name="street" required autoComplete="shipping address-line1" style={sfInput} />
                  </SfField>
                  <SfField label="Núm. exterior" error={errors.extNumber}>
                    <input name="extNumber" style={sfInput} />
                  </SfField>
                  <SfField label="Núm. interior" error={errors.intNumber}>
                    <input name="intNumber" style={sfInput} />
                  </SfField>
                  <SfField label="Colonia" error={errors.neighborhood} style={{ gridColumn: "1 / -1" }}>
                    <input name="neighborhood" autoComplete="shipping address-line2" style={sfInput} />
                  </SfField>
                  <SfField label="Código postal" error={errors.zip}>
                    <input name="zip" required inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="shipping postal-code" style={sfInput} />
                  </SfField>
                  <SfField label="Ciudad" error={errors.city}>
                    <input name="city" required autoComplete="shipping address-level2" style={sfInput} />
                  </SfField>
                  <SfField label="Estado" error={errors.state} style={{ gridColumn: "1 / -1" }}>
                    <select name="state" required defaultValue="" autoComplete="shipping address-level1" style={sfInput}>
                      <option value="" disabled>Elige…</option>
                      {MX_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </SfField>
                  <SfField label="Teléfono de contacto (opcional)" error={errors.addressPhone} style={{ gridColumn: "1 / -1" }}>
                    <input name="addressPhone" inputMode="tel" style={sfInput} />
                  </SfField>
                  {loggedIn ? (
                    <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, gridColumn: "1 / -1", minHeight: 44 }}>
                      <input type="checkbox" name="saveAddress" defaultChecked style={{ width: 18, height: 18 }} />
                      Guardar esta dirección en mi cuenta
                    </label>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>

        <section style={sfPanel}>
          <h2 style={{ fontSize: 22 }}>3. Notas (opcional)</h2>
          <SfField label="¿Algo que debamos saber?" error={errors.notes}>
            <textarea name="notes" rows={3} maxLength={500} style={{ ...sfInput, minHeight: 80 }} />
          </SfField>
        </section>
      </div>

      {/* Resumen */}
      <aside style={{ ...sfPanel, flex: "0 1 360px", width: "100%", position: "sticky", top: 84 }}>
        <h2 style={{ fontSize: 22 }}>Tu pedido</h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {items.map((i) => (
            <li key={i.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--sf-muted)", fontSize: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "var(--sf-radius)", background: "var(--sf-muted)", overflow: "hidden", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.imageUrl ? <img src={i.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{i.name}</div>
                <div className="sf-muted" style={{ fontSize: 12 }}>{[i.variantName, `× ${i.quantity}`].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{formatMXN(i.lineTotalCents)}</div>
            </li>
          ))}
        </ul>
        <SfRow label="Subtotal" value={formatMXN(subtotalCents)} />
        <SfRow label={fulfillment === "pickup" ? "Entrega (recoger en tienda)" : "Envío"} value={shippingCents === 0 ? "Gratis" : formatMXN(shippingCents)} />
        {freeHint ? <p className="sf-muted" style={{ fontSize: 12, margin: "-6px 0 0" }}>{freeHint}</p> : null}
        <div style={{ borderTop: "1px solid var(--sf-muted)", paddingTop: 12 }}>
          <SfRow label="Total" value={formatMXN(totalCents)} strong />
        </div>
        {state?.message ? <SfAlert>{state.message}</SfAlert> : null}
        {Object.keys(errors).length > 0 && !state?.message ? <SfAlert>Revisa los campos marcados.</SfAlert> : null}
        <button type="submit" className="sf-btn sf-btn-primary" disabled={pending} style={{ width: "100%" }}>
          {pending ? "Registrando tu pedido…" : "Continuar al pago"}
        </button>
        <p className="sf-muted" style={{ fontSize: 12, margin: 0, textAlign: "center" }}>Pago seguro con Mercado Pago: tarjeta, transferencia o efectivo.</p>
        <Link href="/carrito" className="sf-link" style={{ justifyContent: "center" }}>Volver al carrito</Link>
      </aside>
    </form>
  );
}

function Choice({ selected, onClick, title, text }: { selected: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} style={{
      textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "inherit", minHeight: 64,
      padding: "12px 14px", borderRadius: "var(--sf-radius)", background: selected ? "var(--sf-muted)" : "transparent",
      border: `2px solid ${selected ? "var(--sf-primary)" : "var(--sf-muted)"}`,
    }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
      <div className="sf-muted" style={{ fontSize: 13, marginTop: 2 }}>{text}</div>
    </button>
  );
}
