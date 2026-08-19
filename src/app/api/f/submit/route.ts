import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { normalizeHost } from "@/lib/host";
import { sendSubmissionEmail } from "@/lib/mailer";
import { rateLimit } from "@/lib/ratelimit";
import { resolveSettings } from "@/lib/settings";
import { resolveSiteByHost } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALIASES: Record<string, string[]> = {
  name: ["name", "nombre", "fullname", "full_name", "nombre_completo", "firstname"],
  email: ["email", "correo", "mail", "e-mail", "correo_electronico"],
  phone: ["phone", "telefono", "teléfono", "tel", "celular", "movil", "whatsapp"],
  message: ["message", "mensaje", "comentario", "comentarios", "comments", "consulta", "detalle"],
};

function pickField(data: Record<string, string>, kind: keyof typeof ALIASES) {
  const keys = Object.keys(data);
  for (const alias of ALIASES[kind]) {
    const hit = keys.find((k) => k.toLowerCase().replace(/[\s-]/g, "_") === alias);
    if (hit && data[hit]?.trim()) return data[hit].trim();
  }
  return undefined;
}

function clientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") ?? "").trim() || "unknown";
}

function reply(req: NextRequest, wantsJson: boolean, ok: boolean, status: number, error?: string) {
  if (wantsJson) {
    return NextResponse.json(ok ? { ok: true } : { ok: false, error }, { status });
  }
  // No-JS fallback: bounce back to the page with a flag it can read. The
  // Location stays relative when there is no referer, because behind Render's
  // proxy req.url is the container-internal host.
  const referer = req.headers.get("referer");
  if (!referer) {
    const flag = ok ? "sent=1" : `error=${encodeURIComponent(error ?? "1")}`;
    return new NextResponse(null, { status: 303, headers: { Location: `/?${flag}` } });
  }
  const back = new URL(referer);
  back.searchParams.set(ok ? "sent" : "error", ok ? "1" : error ?? "1");
  return NextResponse.redirect(back, 303);
}

export async function POST(req: NextRequest) {
  const host = normalizeHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  const contentType = req.headers.get("content-type") ?? "";
  const wantsJson =
    contentType.includes("application/json") || (req.headers.get("accept") ?? "").includes("application/json");

  let data: Record<string, string> = {};
  try {
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(body)) data[k] = typeof v === "string" ? v : String(v ?? "");
    } else {
      const form = await req.formData();
      form.forEach((v, k) => { data[k] = typeof v === "string" ? v : ""; });
    }
  } catch {
    return reply(req, wantsJson, false, 400, "invalid_body");
  }

  const ip = clientIp(req);
  const perIp = rateLimit(`f:${ip}`, 8, 60_000);
  if (!perIp.ok) return reply(req, wantsJson, false, 429, "rate_limited");

  // Honeypot and a minimum fill time — cheap, silent bot filtering.
  const hp = (data._hp ?? "").trim();
  const ts = Number(data._ts ?? 0);
  const tooFast = ts > 0 && Date.now() - ts < 1500;
  if (hp || tooFast) return reply(req, wantsJson, true, 200); // pretend success

  const resolved = await resolveSiteByHost(host);
  if (!resolved) return reply(req, wantsJson, false, 404, "unknown_site");
  const { site } = resolved;
  if (site.status !== "live") return reply(req, wantsJson, false, 403, "site_unavailable");

  const perSite = rateLimit(`s:${site.id}`, 120, 3_600_000);
  if (!perSite.ok) return reply(req, wantsJson, false, 429, "rate_limited");

  const formName = (data._form ?? "contact").slice(0, 80);
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith("_")) continue;
    fields[k.slice(0, 60)] = String(v).slice(0, 5000);
  }

  const email = pickField(fields, "email");
  const message = pickField(fields, "message");
  const name = pickField(fields, "name");
  const phone = pickField(fields, "phone");

  if (!email && !phone && !message) {
    return reply(req, wantsJson, false, 400, "empty_submission");
  }
  if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return reply(req, wantsJson, false, 400, "invalid_email");
  }

  const [row] = await db
    .insert(submissions)
    .values({
      siteId: site.id,
      formName,
      name, email, phone, message,
      data: fields,
      pageUrl: data._url || req.headers.get("referer") || null,
      referrer: req.headers.get("referer"),
      ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 500),
    })
    .returning();

  // Stored first: even if Resend fails, the lead is never lost.
  const settings = await resolveSettings(site.id, site.name);
  const recipients = settings.formRecipients.filter(Boolean);

  if (recipients.length === 0) {
    await db.update(submissions).set({ emailStatus: "skipped" }).where(eq(submissions.id, row.id));
    return reply(req, wantsJson, true, 200);
  }

  const subject = (settings.formSubject || "Nuevo mensaje desde {site}")
    .replace(/\{site\}/g, site.name)
    .replace(/\{form\}/g, formName)
    .slice(0, 180);

  const result = await sendSubmissionEmail(recipients, email, {
    siteName: site.name,
    host,
    formName,
    subject,
    fields,
    pageUrl: data._url || req.headers.get("referer") || undefined,
    submittedAt: row.createdAt,
    replyTo: email,
  });

  await db
    .update(submissions)
    .set({ emailStatus: result.ok ? "sent" : "failed", emailError: result.error ?? null })
    .where(eq(submissions.id, row.id));

  return reply(req, wantsJson, true, 200);
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
