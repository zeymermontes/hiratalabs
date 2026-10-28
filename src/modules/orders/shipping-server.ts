import { getModuleConfig } from "@/lib/modules";
import { normalizeShipping, type ShippingConfig } from "./shipping";

/** Ajustes de envío de la tienda (site_modules.config del módulo `orders`). */
export async function getShippingConfig(siteId: string): Promise<ShippingConfig> {
  const raw = await getModuleConfig<Record<string, unknown>>(siteId, "orders");
  return normalizeShipping(raw);
}
