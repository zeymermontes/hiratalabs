/**
 * Servidor MCP (Streamable HTTP, JSON-RPC 2.0 sobre POST) sin SDK. Solo el
 * subconjunto que necesitan los clientes de escritorio: initialize, ping,
 * tools/list y tools/call. No hay stream SSE: cada POST responde JSON.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { mcpAudit } from "./schema";
import { TOOL_BY_NAME, ToolError, listToolsFor, type ToolContext } from "./tools";

export const PROTOCOL_VERSION = "2025-03-26";
export const SERVER_INFO = { name: "hirata-commerce", version: "0.1.0" };

export type JsonRpcId = string | number | null;
export type JsonRpcRequest = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: unknown };
export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string; data?: unknown } };

export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
  /** Rango reservado para la aplicación. */
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  RATE_LIMITED: -32029,
} as const;

export function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } };
}

export function rpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

const requestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1).max(100),
  params: z.unknown().optional(),
});

export function parseRequest(raw: unknown): JsonRpcRequest | null {
  const r = requestSchema.safeParse(raw);
  return r.success ? (r.data as JsonRpcRequest) : null;
}

export function isNotification(req: JsonRpcRequest): boolean {
  return req.id === undefined || req.method.startsWith("notifications/");
}

const callParams = z.object({
  name: z.string().min(1).max(100),
  arguments: z.record(z.unknown()).optional(),
});

async function audit(ctx: ToolContext, tool: string, ok: boolean, ms: number, error?: string) {
  await db.insert(mcpAudit).values({
    siteId: ctx.siteId, tokenId: ctx.tokenId, tool, ok, ms, error: error?.slice(0, 500) ?? null,
  }).catch(() => null);
}

/** Lo que devuelve tools/call: texto JSON para la IA, structuredContent para clientes que lo lean. */
function toolResult(payload: unknown, isError = false) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const out: Record<string, unknown> = { content: [{ type: "text", text }], isError };
  if (!isError && payload && typeof payload === "object") out.structuredContent = payload;
  return out;
}

/**
 * Despacha un request ya autenticado. Devuelve null para notificaciones (no
 * llevan respuesta). Las fallas de una herramienta se reportan como resultado
 * con isError (así lo pide MCP), no como error JSON-RPC.
 */
export async function dispatch(ctx: ToolContext, req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;
  if (isNotification(req)) return null;

  switch (req.method) {
    case "initialize": {
      void audit(ctx, "initialize", true, 0);
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          `Servidor MCP de la tienda. Todas las herramientas operan solo sobre esta tienda; los montos están en pesos mexicanos (MXN). ` +
          `Permisos del token: ${ctx.scopes.join(", ")}. / Store MCP server; all tools are scoped to this store, amounts in MXN.`,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: listToolsFor(ctx.scopes) });
    case "tools/call": {
      const parsed = callParams.safeParse(req.params);
      if (!parsed.success) return rpcError(id, RPC.INVALID_PARAMS, "params inválidos: se espera { name, arguments }");
      const { name, arguments: args = {} } = parsed.data;
      const tool = TOOL_BY_NAME[name];
      if (!tool) {
        void audit(ctx, name, false, 0, "unknown_tool");
        return rpcError(id, RPC.INVALID_PARAMS, `Herramienta desconocida: ${name}`);
      }
      if (!ctx.scopes.includes(tool.scope)) {
        void audit(ctx, name, false, 0, "scope_denied");
        return rpcResult(id, toolResult(`Este token no tiene permiso "${tool.scope}" para ${name}. / Token lacks the "${tool.scope}" scope.`, true));
      }
      const validated = tool.schema.safeParse(args);
      if (!validated.success) {
        const issues = validated.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
        void audit(ctx, name, false, 0, `invalid_args: ${issues}`);
        return rpcResult(id, toolResult(`Argumentos inválidos / invalid arguments: ${issues}`, true));
      }
      const started = Date.now();
      try {
        const out = await tool.run(ctx, validated.data);
        void audit(ctx, name, true, Date.now() - started);
        return rpcResult(id, toolResult(out));
      } catch (err) {
        const ms = Date.now() - started;
        if (err instanceof ToolError) {
          void audit(ctx, name, false, ms, `${err.code}: ${err.message}`);
          return rpcResult(id, toolResult(err.message, true));
        }
        const message = err instanceof Error ? err.message : "error";
        console.error(`[mcp] ${ctx.siteId} ${name}: ${message}`);
        void audit(ctx, name, false, ms, message);
        return rpcResult(id, toolResult("Error interno al ejecutar la herramienta. / Internal error running the tool.", true));
      }
    }
    default:
      return rpcError(id, RPC.METHOD_NOT_FOUND, `Método no soportado: ${req.method}`);
  }
}
