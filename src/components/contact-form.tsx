"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/(admin)/actions";
import { Field } from "@/components/ui";

export type ContactValues = {
  brandName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  socials: Record<string, string>;
  formRecipients: string[];
  formSubject: string;
  custom: Record<string, string>;
};

const SOCIALS: { key: string; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/marca" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/marca" },
  { key: "x", label: "X / Twitter", placeholder: "https://x.com/marca" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/marca" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@marca" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@marca" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@marca" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/marca" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/marca" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/marca" },
];

export function ContactForm({
  action, values, siteId,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  values: ContactValues;
  siteId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const customText = Object.entries(values.custom).map(([k, v]) => `${k}=${v}`).join("\n");

  return (
    <form action={formAction} className="space-y-6">
      {siteId ? <input type="hidden" name="siteId" value={siteId} /> : null}

      <section className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-900">Datos de contacto</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de marca" hint="Se expone como site.brandName.">
            <input name="brandName" defaultValue={values.brandName} placeholder="ACME" className="input" />
          </Field>
          <Field label="Correo público" hint="site.email · site.emailHref (mailto:)">
            <input name="email" type="email" defaultValue={values.email} placeholder="hola@acme.com" className="input" />
          </Field>
          <Field label="Teléfono" hint="site.phone · site.phoneHref (tel:)">
            <input name="phone" defaultValue={values.phone} placeholder="+52 55 1234 5678" className="input" />
          </Field>
          <Field label="WhatsApp" hint="Con lada, sin espacios. Genera site.whatsappHref (wa.me).">
            <input name="whatsapp" defaultValue={values.whatsapp} placeholder="+525512345678" className="input" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección" hint="site.address · site.addressHref (Google Maps)">
              <input name="address" defaultValue={values.address} placeholder="Av. Reforma 123, CDMX" className="input" />
            </Field>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Redes sociales</h3>
        <p className="hint mb-4">URLs completas. Los enlaces vacíos se ocultan solos en la landing.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <Field key={s.key} label={s.label}>
              <input
                name={`social_${s.key}`}
                defaultValue={values.socials[s.key] ?? ""}
                placeholder={s.placeholder}
                className="input"
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Formularios de contacto</h3>
        <p className="hint mb-4">
          A dónde llegan los mensajes que envían los visitantes. Se mandan desde el remitente central vía Resend,
          con <em>reply-to</em> al correo de quien escribió. Si lo dejas vacío, los mensajes se guardan en el panel
          pero no se envían por correo.
        </p>
        <div className="space-y-4">
          <Field label="Correos que reciben los mensajes" hint="Uno por línea o separados por coma.">
            <textarea
              name="formRecipients" rows={3}
              defaultValue={values.formRecipients.join("\n")}
              placeholder="ventas@acme.com"
              className="input"
            />
          </Field>
          <Field label="Asunto del correo" hint="{site} = nombre del sitio · {form} = nombre del formulario.">
            <input
              name="formSubject" defaultValue={values.formSubject}
              placeholder="Nuevo mensaje desde {site}" className="input"
            />
          </Field>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-1 text-sm font-semibold text-neutral-900">Valores personalizados</h3>
        <p className="hint mb-4">
          Una línea por valor: <code className="rounded bg-neutral-100 px-1">clave=valor</code>. Llegan a la landing
          como <code className="rounded bg-neutral-100 px-1">site.custom.clave</code>. Lo que dejes vacío
          simplemente no aparece en la página.
        </p>
        <textarea name="custom" rows={4} defaultValue={customText} placeholder={"horario=Lun a Vie 9-18\nrfc=ACM123456ABC"} className="input font-mono text-xs" />
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.ok ? <span className="text-sm text-emerald-700">{state.message}</span> : null}
      </div>
    </form>
  );
}
