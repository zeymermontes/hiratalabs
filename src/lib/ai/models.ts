import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiModels } from "@/lib/db/schema";
import type { ProviderId } from "./providers";

export { PRICE_SCALE, costOf, formatUsd, fromMicros, toMicros } from "./pricing";

/**
 * A site may pin a model; otherwise it uses whatever the provider's default is.
 * Returns null when neither exists, which the caller reports as a config error.
 */
export async function resolveModel(
  provider: ProviderId, siteModel: string | null,
): Promise<string | null> {
  const pinned = (siteModel ?? "").trim();
  if (pinned) return pinned;

  const [fallback] = await db
    .select()
    .from(aiModels)
    .where(and(eq(aiModels.provider, provider), eq(aiModels.isDefault, true)));

  return fallback?.model ?? null;
}
