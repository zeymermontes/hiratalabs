"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteAddress, saveAddress, setDefaultAddress, type AddressState } from "@/modules/orders/addresses";
import { MX_STATES, SfAlert, SfField, sfInput, sfPanel } from "./checkout-ui";

export type AddressRow = {
  id: string; label: string; recipient: string; street: string; extNumber: string | null; intNumber: string | null;
  neighborhood: string | null; city: string; state: string; zip: string; phone: string | null; isDefault: boolean;
};

export function AddressBook({ addresses }: { addresses: AddressRow[] }) {
  const [editing, setEditing] = useState<AddressRow | null | "new">(addresses.length === 0 ? "new" : null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {addresses.map((a) => (
        <div key={a.id} style={{ ...sfPanel, gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <strong>{a.label}{a.isDefault ? <span className="sf-muted" style={{ fontWeight: 600, fontSize: 12 }}> · principal</span> : null}</strong>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {a.recipient}<br />
            {a.street} {a.extNumber ?? ""}{a.intNumber ? ` int. ${a.intNumber}` : ""}{a.neighborhood ? `, ${a.neighborhood}` : ""}<br />
            {a.zip} {a.city}, {a.state}{a.phone ? ` · Tel. ${a.phone}` : ""}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="sf-btn sf-btn-ghost" style={{ minHeight: 40, fontSize: 13 }} onClick={() => setEditing(a)}>Editar</button>
            {!a.isDefault ? (
              <form action={setDefaultAddress.bind(null, a.id)}>
                <button type="submit" className="sf-btn sf-btn-ghost" style={{ minHeight: 40, fontSize: 13 }}>Usar como principal</button>
              </form>
            ) : null}
            <form action={deleteAddress.bind(null, a.id)} onSubmit={(e) => { if (!confirm("¿Borrar esta dirección?")) e.preventDefault(); }}>
              <button type="submit" className="sf-btn sf-btn-ghost" style={{ minHeight: 40, fontSize: 13, color: "#d23b3b" }}>Borrar</button>
            </form>
          </div>
        </div>
      ))}

      {editing ? (
        <AddressForm key={editing === "new" ? "new" : editing.id} address={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" className="sf-btn sf-btn-outline" onClick={() => setEditing("new")}>Agregar dirección</button>
      )}
    </div>
  );
}

function AddressForm({ address, onDone }: { address: AddressRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<AddressState | undefined, FormData>(saveAddress, undefined);
  const e = state?.errors ?? {};
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <form action={action} style={{ ...sfPanel, borderColor: "var(--sf-primary)" }}>
      <h2 style={{ fontSize: 20 }}>{address ? "Editar dirección" : "Nueva dirección"}</h2>
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <SfField label="Nombre de la dirección" error={e.label} hint="Casa, Oficina…">
          <input name="label" required defaultValue={address?.label ?? "Casa"} style={sfInput} />
        </SfField>
        <SfField label="Quién recibe" error={e.recipient}>
          <input name="recipient" required autoComplete="name" defaultValue={address?.recipient ?? ""} style={sfInput} />
        </SfField>
        <SfField label="Calle" error={e.street} style={{ gridColumn: "1 / -1" }}>
          <input name="street" required autoComplete="address-line1" defaultValue={address?.street ?? ""} style={sfInput} />
        </SfField>
        <SfField label="Núm. exterior" error={e.extNumber}><input name="extNumber" defaultValue={address?.extNumber ?? ""} style={sfInput} /></SfField>
        <SfField label="Núm. interior" error={e.intNumber}><input name="intNumber" defaultValue={address?.intNumber ?? ""} style={sfInput} /></SfField>
        <SfField label="Colonia" error={e.neighborhood} style={{ gridColumn: "1 / -1" }}>
          <input name="neighborhood" defaultValue={address?.neighborhood ?? ""} style={sfInput} />
        </SfField>
        <SfField label="Código postal" error={e.zip}>
          <input name="zip" required inputMode="numeric" maxLength={5} pattern="\d{5}" autoComplete="postal-code" defaultValue={address?.zip ?? ""} style={sfInput} />
        </SfField>
        <SfField label="Ciudad" error={e.city}><input name="city" required autoComplete="address-level2" defaultValue={address?.city ?? ""} style={sfInput} /></SfField>
        <SfField label="Estado" error={e.state} style={{ gridColumn: "1 / -1" }}>
          <select name="state" required defaultValue={address?.state ?? ""} style={sfInput}>
            <option value="" disabled>Elige…</option>
            {MX_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </SfField>
        <SfField label="Teléfono (opcional)" error={e.phone} style={{ gridColumn: "1 / -1" }}>
          <input name="phone" inputMode="tel" defaultValue={address?.phone ?? ""} style={sfInput} />
        </SfField>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, gridColumn: "1 / -1", minHeight: 44 }}>
          <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? false} style={{ width: 18, height: 18 }} />
          Usar como dirección principal
        </label>
      </div>
      {state?.message && !state.ok ? <SfAlert>{state.message}</SfAlert> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" className="sf-btn sf-btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="sf-btn sf-btn-ghost" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}
