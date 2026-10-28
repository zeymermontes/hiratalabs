import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { MCP_SCOPES, mcpTokens, type McpScope, type McpToken } from "./schema";

export const TOKEN_PREFIX = "hl_mcp_";

/** `hl_mcp_` + 32 caracteres base64url. El prefijo visible son los primeros 8 del total. */
export function generateRawToken(): string {
  // 24 bytes → 32 caracteres base64url exactos.
  return `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function displayPrefix(raw: string): string {
  return raw.slice(0, 8);
}

export function normalizeScopes(input: unknown): McpScope[] {
  const list = Array.isArray(input) ? input : [];
  const out = new Set<McpScope>(["read"]);
  for (const s of list) if (typeof s === "string" && (MCP_SCOPES as readonly string[]).includes(s)) out.add(s as McpScope);
  return MCP_SCOPES.filter((s) => out.has(s));
}

export function hasScope(token: Pick<McpToken, "scopes">, scope: McpScope): boolean {
  return token.scopes.includes(scope);
}

/** Token vigente (no revocado) a partir del valor crudo que mandó el cliente. */
export async function findActiveToken(raw: string): Promise<McpToken | null> {
  if (!raw.startsWith(TOKEN_PREFIX) || raw.length < 20 || raw.length > 128) return null;
  const [row] = await db.select().from(mcpTokens)
    .where(and(eq(mcpTokens.tokenHash, hashToken(raw)), isNull(mcpTokens.revokedAt)));
  return row ?? null;
}

export async function touchToken(id: string) {
  await db.update(mcpTokens).set({ lastUsedAt: new Date() }).where(eq(mcpTokens.id, id)).catch(() => null);
}
