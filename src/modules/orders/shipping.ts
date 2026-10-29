import type { FulfillmentKind } from "./schema";

// Sin imports de servidor: este archivo también lo usa el checkout en el navegador.
// getShippingConfig vive en shipping-server.ts.

/** Ajustes de envío; viven en site_modules.config del módulo `orders`. */
export type ShippingConfig = {
  /** Costo fijo por pedido, en centavos. */
  flatCents: number;
  /** Envío gratis a partir de este subtotal (centavos); null = nunca. */
  freeOverCents: number | null;
  pickupEnabled: boolean;
  /** Texto que ve el cliente al elegir recoger ("Av. X 123, L–V 10–18 h"). */
  pickupNote?: string;
  /** "3 a 5 días hábiles". */
  estimatedDays?: string;
};

export const DEFAULT_SHIPPING: ShippingConfig = {
  flatCents: 10_000,
  freeOverCents: null,
  pickupEnabled: false,
  pickupNote: "",
  estimatedDays: "3 a 5 días hábiles",
};

export function normalizeShipping(raw: Partial<ShippingConfig> | Record<string, unknown>): ShippingConfig {
  const r = raw as Partial<ShippingConfig>;
  const flat = Number(r.flatCents);
  const free = r.freeOverCents === null || r.freeOverCents === undefined ? null : Number(r.freeOverCents);
  return {
    flatCents: Number.isFinite(flat) && flat >= 0 ? Math.round(flat) : DEFAULT_SHIPPING.flatCents,
    freeOverCents: free !== null && Number.isFinite(free) && free > 0 ? Math.round(free) : null,
    pickupEnabled: Boolean(r.pickupEnabled),
    pickupNote: typeof r.pickupNote === "string" ? r.pickupNote : "",
    estimatedDays: typeof r.estimatedDays === "string" ? r.estimatedDays : DEFAULT_SHIPPING.estimatedDays,
  };
}

/** Costo de envío en centavos para un subtotal y forma de entrega. */
export function computeShipping(config: ShippingConfig, subtotalCents: number, fulfillment: FulfillmentKind): number {
  if (fulfillment === "pickup") return 0;
  if (config.freeOverCents !== null && subtotalCents >= config.freeOverCents) return 0;
  return config.flatCents;
}
