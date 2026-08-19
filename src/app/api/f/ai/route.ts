import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { resolveModel } from "@/lib/ai/models";
import { askForQuestions, type ProviderId } from "@/lib/ai/providers";
import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { aiKeys, aiUsage, siteChat } from "@/lib/db/schema";
import { normalizeHost } from "@/lib/host";
import { rateLimit } from "@/lib/ratelimit";
import { resolveSiteByHost } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The widget treats an empty list as "no follow-up questions" and moves on, so
 * every failure path here returns 200 with an empty list. A visitor never sees
 * an AI error; the reason is recorded in ai_usage instead.
 */
function skip() {
  return NextResponse.json({ questions: [] });
}

function clientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") ?? "").trim() || "unknown";
}

async function record(
  siteId: string, provider: ProviderId, model: string | null,
  ok: boolean, error?: string, inputTokens?: number, outputTokens?: number,
) {
  await db.insert(aiUsage).values({
    siteId, provider, model, ok,
    error: error?.slice(0, 500) ?? null,
    inputTokens: inputTokens ?? null,
    outputTokens: outputTokens ?? null,
  });
}

export async function POST(req: NextRequest) {
  const host = normalizeHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));

  const ip = clientIp(req);
  // Tighter than the contact form: every call here costs money.
  if (!rateLimit(`ai:${ip}`, 6, 600_000).ok) return skip();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return skip();
  }

  const description = String(body.description ?? "").trim();
  const service = String(body.service ?? "").trim().slice(0, 120);
  if (description.length < 12) return skip();

  const resolved = await resolveSiteByHost(host);
  if (!resolved || resolved.site.status !== "live") return skip();
  const site = resolved.site;

  const [chat] = await db.select().from(siteChat).where(eq(siteChat.siteId, site.id));
  if (!chat || !chat.enabled) return skip();

  // Monthly cap, counted from the first of the current month.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ used }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(and(eq(aiUsage.siteId, site.id), gte(aiUsage.createdAt, monthStart), eq(aiUsage.ok, true)));

  if (used >= chat.monthlyLimit) {
    await record(site.id, chat.provider, chat.model, false, "monthly_limit_reached");
    return skip();
  }

  let apiKey: string;
  try {
    if (chat.keyMode === "own") {
      if (!chat.ownSecret) throw new Error("El sitio está en modo llave propia pero no tiene llave.");
      apiKey = decryptSecret(chat.ownSecret);
    } else {
      const rows = await db.select().from(aiKeys).where(eq(aiKeys.provider, chat.provider));
      const chosen = rows.find((r) => r.isDefault) ?? rows[0];
      if (!chosen) throw new Error(`No hay llave de plataforma para ${chat.provider}.`);
      apiKey = decryptSecret(chosen.secret);
    }
  } catch (err) {
    await record(site.id, chat.provider, chat.model, false, err instanceof Error ? err.message : "key_error");
    return skip();
  }

  // The site's own model wins; otherwise the provider's configured default.
  const model = await resolveModel(chat.provider, chat.model);
  if (!model) {
    await record(site.id, chat.provider, null, false, "no_model_configured");
    return skip();
  }

  try {
    const result = await askForQuestions(chat.provider, apiKey, model, {
      service,
      description,
      businessContext: chat.businessContext ?? "",
      siteName: site.name,
    });
    await record(site.id, chat.provider, model, true, undefined, result.inputTokens, result.outputTokens);
    return NextResponse.json({ questions: result.questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error(`[ai] ${site.slug}: ${message}`);
    await record(site.id, chat.provider, model, false, message);
    return skip();
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
