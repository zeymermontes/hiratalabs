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

export type SubmissionEmail = {
  siteName: string;
  host: string;
  formName: string;
  subject: string;
  fields: Record<string, string>;
  pageUrl?: string;
  ip?: string;
  submittedAt: Date;
  adminUrl: string;
};

function renderHtml(m: SubmissionEmail) {
  const rows = Object.entries(m.fields)
    .filter(([, v]) => v && v.trim())
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap">${esc(k)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#111827;font-size:14px">${esc(v).replace(/\n/g, "<br>")}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <tr><td style="padding:20px 24px;border-bottom:1px solid #e5e7eb">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af">${esc(m.siteName)}</div>
      <div style="font-size:17px;font-weight:600;color:#111827;margin-top:4px">${esc(m.formName || "Formulario de contacto")}</div>
    </td></tr>
    <tr><td style="padding:8px 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
    <tr><td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;line-height:1.6">
      ${esc(m.host)}${m.pageUrl ? ` &middot; ${esc(m.pageUrl)}` : ""}<br>
      ${m.submittedAt.toISOString()}${m.ip ? ` &middot; IP ${esc(m.ip)}` : ""}<br>
      <a href="${esc(m.adminUrl)}" style="color:#6b7280">Ver en el panel</a>
    </td></tr>
  </table>
</body></html>`;
}

function renderText(m: SubmissionEmail) {
  const lines = Object.entries(m.fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`);
  return [`${m.siteName} — ${m.formName || "Formulario de contacto"}`, "", ...lines, "", m.host, m.submittedAt.toISOString()].join("\n");
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
    host: "test",
    formName: "Prueba de configuración",
    subject: `Prueba de correo — ${siteName}`,
    fields: {
      Estado: "Si recibes esto, Resend está configurado correctamente.",
      Remitente: env.resendFrom,
    },
    submittedAt: new Date(),
    adminUrl: env.adminUrl,
  });
}
