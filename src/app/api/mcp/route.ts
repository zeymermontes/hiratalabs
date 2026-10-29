import { NextResponse, type NextRequest } from "next/server";
import { isModuleEnabledById } from "@/lib/modules";
import { rateLimit } from "@/lib/ratelimit";
import { dispatch, isNotification, parseRequest, rpcError, RPC, type JsonRpcResponse } from "@/modules/mcp/server";
import { findActiveToken, touchToken } from "@/modules/mcp/tokens";
import type { McpScope } from "@/modules/mcp/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint MCP (Streamable HTTP). Vive en el host del panel:
 * https://<ADMIN_HOST>/api/mcp — en los hosts de tienda el proxy no lo deja
 * pasar, y así el token nunca viaja a un dominio del cliente.
 *
 * Los clientes corren en apps de escritorio, por eso CORS abierto: la
 * autorización es el Bearer, no el origen.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

const MAX_BODY_BYTES = 256 * 1024;
const MAX_BATCH = 20;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  // Sin stream SSE: cada POST responde JSON completo.
  return json({ ok: false, error: "method_not_allowed", hint: "POST JSON-RPC 2.0 con Authorization: Bearer <token>" }, 405);
}

export async function DELETE() {
  // Sin sesiones que cerrar.
  return new NextResponse(null, { status: 204, headers: CORS });
}

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function POST(req: NextRequest) {
  const raw = bearer(req);
  if (!raw) {
    return json(rpcError(null, RPC.UNAUTHORIZED, "Falta Authorization: Bearer <token>"), 401);
  }

  // Un freno barato antes de pegarle a la base: por IP, para tokens inventados.
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || "unknown";
  if (!rateLimit(`mcp:ip:${ip}`, 300, 60_000).ok) {
    return json(rpcError(null, RPC.RATE_LIMITED, "Demasiadas peticiones"), 429);
  }

  const token = await findActiveToken(raw);
  if (!token) {
    return json(rpcError(null, RPC.UNAUTHORIZED, "Token inválido o revocado"), 401);
  }
  if (!(await isModuleEnabledById(token.siteId, "mcp_access"))) {
    return json(rpcError(null, RPC.FORBIDDEN, "El módulo 'Conectar tu propia IA (MCP)' está apagado en este sitio"), 403);
  }
  if (!rateLimit(`mcp:token:${token.id}`, 120, 60_000).ok) {
    return json(rpcError(null, RPC.RATE_LIMITED, "Límite de 120 llamadas por minuto alcanzado"), 429);
  }

  const lengthHeader = Number(req.headers.get("content-length") ?? 0);
  if (lengthHeader > MAX_BODY_BYTES) return json(rpcError(null, RPC.INVALID_REQUEST, "Cuerpo demasiado grande"), 413);

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json(rpcError(null, RPC.INVALID_REQUEST, "Cuerpo demasiado grande"), 413);
    body = JSON.parse(text);
  } catch {
    return json(rpcError(null, RPC.PARSE_ERROR, "JSON inválido"), 400);
  }

  const ctx = {
    siteId: token.siteId,
    tokenId: token.id,
    tokenName: token.name,
    scopes: token.scopes as McpScope[],
  };
  void touchToken(token.id);

  const batch = Array.isArray(body);
  const items = batch ? (body as unknown[]) : [body];
  if (items.length === 0 || items.length > MAX_BATCH) {
    return json(rpcError(null, RPC.INVALID_REQUEST, "Lote vacío o demasiado grande"), 400);
  }

  const responses: JsonRpcResponse[] = [];
  for (const item of items) {
    const parsed = parseRequest(item);
    if (!parsed) {
      responses.push(rpcError(null, RPC.INVALID_REQUEST, "Request JSON-RPC inválido"));
      continue;
    }
    if (isNotification(parsed)) continue;
    responses.push(await dispatch(ctx, parsed) ?? rpcError(parsed.id ?? null, RPC.INTERNAL, "Sin respuesta"));
  }

  // Solo notificaciones: 202 sin cuerpo, como pide el transporte.
  if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS });
  return json(batch ? responses : responses[0]);
}
