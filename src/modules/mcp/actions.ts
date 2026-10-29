"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { mcpTokens } from "./schema";
import { displayPrefix, generateRawToken, hashToken, normalizeScopes } from "./tokens";

export type CreateTokenState = {
  ok?: boolean;
  error?: string;
  /** El valor crudo, solo en la respuesta de creación. Nunca se vuelve a mostrar. */
  rawToken?: string;
  name?: string;
};

const MAX_ACTIVE_TOKENS = 10;

export async function createMcpToken(_prev: CreateTokenState, form: FormData): Promise<CreateTokenState> {
  const siteId = String(form.get("siteId") ?? "");
  const access = await requireSiteAccess(siteId, { manage: true });

  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 2) return { error: "Ponle un nombre al token (por ejemplo, 'Claude Desktop de Ana')." };
  const scopes = normalizeScopes(form.getAll("scopes").map(String));

  const [{ active }] = await db.select({ active: sql<number>`count(*)::int` }).from(mcpTokens)
    .where(and(eq(mcpTokens.siteId, siteId), isNull(mcpTokens.revokedAt)));
  if (active >= MAX_ACTIVE_TOKENS) {
    return { error: `Ya hay ${MAX_ACTIVE_TOKENS} tokens activos. Revoca alguno antes de crear otro.` };
  }

  const raw = generateRawToken();
  await db.insert(mcpTokens).values({
    siteId,
    name,
    tokenHash: hashToken(raw),
    prefix: displayPrefix(raw),
    scopes,
    createdBy: access.user.email,
  });

  revalidatePath(`/sites/${siteId}/mcp`);
  return { ok: true, rawToken: raw, name };
}

export async function revokeMcpToken(siteId: string, tokenId: string): Promise<{ ok?: boolean; error?: string }> {
  await requireSiteAccess(siteId, { manage: true });
  const [row] = await db.select({ id: mcpTokens.id, revokedAt: mcpTokens.revokedAt }).from(mcpTokens)
    .where(and(eq(mcpTokens.id, tokenId), eq(mcpTokens.siteId, siteId)));
  if (!row) return { error: "Ese token no existe." };
  if (!row.revokedAt) {
    await db.update(mcpTokens).set({ revokedAt: new Date() })
      .where(and(eq(mcpTokens.id, tokenId), eq(mcpTokens.siteId, siteId)));
  }
  revalidatePath(`/sites/${siteId}/mcp`);
  return { ok: true };
}
