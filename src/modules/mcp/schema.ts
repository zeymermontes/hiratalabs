/**
 * Módulo mcp_access: tokens por sitio para que el dueño conecte su propia IA
 * (Claude Desktop, Cursor, ChatGPT…) al servidor MCP de la plataforma.
 *
 * Seguridad: el token crudo se muestra UNA vez al crearlo; aquí solo vive su
 * sha256. Cada llamada deja fila en mcp_audit.
 */
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sites } from "@/lib/db/schema";

export const MCP_SCOPES = ["read", "write"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export const mcpTokens = pgTable("mcp_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** sha256 hex del token crudo. */
  tokenHash: text("token_hash").notNull(),
  /** Primeros 8 caracteres, solo para que el dueño lo reconozca en la lista. */
  prefix: text("prefix").notNull(),
  scopes: text("scopes").array().notNull().default(["read"]),
  createdBy: text("created_by"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  hashIdx: uniqueIndex("mcp_tokens_hash_idx").on(t.tokenHash),
  siteIdx: index("mcp_tokens_site_idx").on(t.siteId),
}));

export const mcpAudit = pgTable("mcp_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  tokenId: uuid("token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
  /** Nombre de la herramienta MCP (o del método JSON-RPC si no fue tools/call). */
  tool: text("tool").notNull(),
  ok: boolean("ok").notNull().default(true),
  ms: integer("ms"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  siteIdx: index("mcp_audit_site_created_idx").on(t.siteId, t.createdAt),
}));

export type McpToken = typeof mcpTokens.$inferSelect;
export type McpAuditRow = typeof mcpAudit.$inferSelect;
