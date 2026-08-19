import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;

function resend() {
  if (!env.resendKey) return null;
  if (!client) client = new Resend(env.resendKey);
  return client;
}

function esc(v: string) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Brand palette, straight from the logo artwork. */
const INK = "#0B0A26";
const BONE = "#F4F7EB";
const LIME = "#B7D546";
const VIOLET = "#6641E0";
const MUTED = "#8A8CA3";
const LINE = "#E4E7DC";

/**
 * Email clients that support webfonts get the brand faces; everyone else lands
 * on a condensed fallback that keeps the wordmark's proportions.
 */
const DISPLAY = "'Bebas Neue', 'Oswald', 'Arial Narrow', Impact, sans-serif";
const BODY = "'Blinker', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

const TIMEZONE = "America/Mexico_City";

/** Times are always shown in Mexico City, whatever the server's clock is set to. */
function stamp(date: Date): string {
  const formatted = new Intl.DateTimeFormat("es-MX", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${formatted} (CDMX)`;
}

export type SubmissionEmail = {
  siteName: string;
  host: string;
  formName: string;
  subject: string;
  fields: Record<string, string>;
  pageUrl?: string;
  submittedAt: Date;
};

function wordmark() {
  return `<span style="font-family:${DISPLAY};font-size:26px;letter-spacing:.04em;color:${BONE};line-height:1">HIRATA</span>` +
    `<span style="font-family:${DISPLAY};font-size:26px;letter-spacing:.04em;color:${LIME};line-height:1"> LABS</span>`;
}

export function renderHtml(m: SubmissionEmail) {
  const entries = Object.entries(m.fields).filter(([, v]) => v && v.trim());

  const rows = entries
    .map(([k, v], i) => `
      <tr>
        <td style="padding:14px 0 4px;font-family:${BODY};font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:${MUTED};${i === 0 ? "" : "border-top:1px solid " + LINE + ";"}">${esc(k)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 12px;font-family:${BODY};font-size:16px;line-height:1.5;color:${INK};">${esc(v).replace(/\n/g, "<br>")}</td>
      </tr>`)
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(m.subject)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Blinker:wght@400;600&display=swap">
</head>
<body style="margin:0;padding:0;background:${BONE};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(entries.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · "))}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 16px;">
    <tr><td align="center">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">

        <tr>
          <td style="background:${INK};padding:22px 28px;">
            ${wordmark()}
            <div style="height:3px;width:36px;background:${LIME};margin-top:14px;border-radius:2px;"></div>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 28px 4px;">
            <div style="font-family:${BODY};font-size:11px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:${VIOLET};">
              ${esc(m.formName || "Formulario de contacto")}
            </div>
            <div style="font-family:${DISPLAY};font-size:30px;letter-spacing:.02em;color:${INK};margin-top:8px;line-height:1.1;">
              NUEVO MENSAJE
            </div>
            <div style="font-family:${BODY};font-size:15px;color:${MUTED};margin-top:4px;">
              desde ${esc(m.siteName)}
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:14px 28px 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          </td>
        </tr>

        <tr>
          <td style="padding:6px 28px 24px;">
            <div style="background:${BONE};border-left:3px solid ${LIME};padding:12px 14px;border-radius:0 8px 8px 0;font-family:${BODY};font-size:13px;color:${INK};line-height:1.5;">
              Responde este correo para contestarle directamente a la persona.
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:${INK};padding:16px 28px;">
            <div style="font-family:${MONO};font-size:11px;color:${BONE};opacity:.72;line-height:1.7;">
              ${esc(m.host)}${m.pageUrl ? `<br>${esc(m.pageUrl)}` : ""}<br>${esc(stamp(m.submittedAt))}
            </div>
          </td>
        </tr>

      </table>

      <div style="font-family:${BODY};font-size:11px;color:${MUTED};margin-top:14px;">
        Hirata Labs
      </div>

    </td></tr>
  </table>
</body>
</html>`;
}

export function renderText(m: SubmissionEmail) {
  const lines = Object.entries(m.fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`);

  return [
    `HIRATA LABS`,
    `${m.formName || "Formulario de contacto"} — ${m.siteName}`,
    "",
    ...lines,
    "",
    "Responde este correo para contestarle directamente a la persona.",
    "",
    m.pageUrl ? `${m.host} · ${m.pageUrl}` : m.host,
    stamp(m.submittedAt),
  ].join("\n");
}

export async function sendSubmissionEmail(
  to: string[],
  replyTo: string | undefined,
  message: SubmissionEmail,
): Promise<{ ok: boolean; error?: string }> {
  const r = resend();
  if (!r) return { ok: false, error: "RESEND_API_KEY is not configured" };
  if (to.length === 0) return { ok: false, error: "No recipients configured" };

  const { error } = await r.emails.send({
    from: env.resendFrom,
    to,
    bcc: env.resendBcc ? [env.resendBcc] : undefined,
    replyTo: replyTo || undefined,
    subject: message.subject,
    html: renderHtml(message),
    text: renderText(message),
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Used by the "send test email" button in the admin. */
export async function sendTestEmail(to: string[], siteName: string) {
  return sendSubmissionEmail(to, undefined, {
    siteName,
    host: env.rootDomain,
    formName: "Prueba de configuración",
    subject: `Prueba de correo — ${siteName}`,
    fields: {
      Estado: "Si recibes esto, Resend está configurado correctamente.",
      Remitente: env.resendFrom,
    },
    submittedAt: new Date(),
  });
}
