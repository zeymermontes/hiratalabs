"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseServer } from "@/lib/supabase/server";
import { mergeGuestCart } from "./cart";
import { ensureCustomer, getCustomerSession } from "./customers";
import { storeFromHeaders, storeUrl } from "./request";

export type AuthState = {
  errors?: Record<string, string | undefined>;
  message?: string;
  ok?: boolean;
};

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  password: z.string().min(6, "Mínimo 6 caracteres."),
});

const SignupSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre."),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  password: z.string().min(8, "Mínimo 8 caracteres.").regex(/[a-zA-Z]/, "Incluye al menos una letra.").regex(/[0-9]/, "Incluye al menos un número."),
});

const RecoverSchema = z.object({ email: z.string().trim().toLowerCase().email("Escribe un correo válido.") });

const PasswordSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres.").regex(/[a-zA-Z]/, "Incluye al menos una letra.").regex(/[0-9]/, "Incluye al menos un número."),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden." });

function errorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/** Solo rutas internas: nunca se redirige a otro origen por un parámetro. */
function safeNext(raw: FormDataEntryValue | null, fallback = "/mi-cuenta"): string {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

async function store() {
  const ctx = await storeFromHeaders();
  if (!ctx || !ctx.modules.has("customers")) return null;
  return ctx;
}

export async function customerLogin(_prev: AuthState | undefined, form: FormData): Promise<AuthState> {
  const ctx = await store();
  if (!ctx) return { message: "Las cuentas de cliente no están disponibles en esta tienda." };
  const parsed = LoginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };

  const rl = rateLimit(`login:${ctx.site.id}:${parsed.data.email}`, 8, 10 * 60_000);
  if (!rl.ok) return { message: "Demasiados intentos. Espera unos minutos." };

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword(parsed.data);
  if (error || !data.user?.email) return { message: "Correo o contraseña incorrectos." };

  const meta = (data.user.user_metadata ?? {}) as { full_name?: string; phone?: string };
  const customer = await ensureCustomer(ctx.site.id, { id: data.user.id, email: data.user.email, fullName: meta.full_name, phone: meta.phone });
  await mergeGuestCart(ctx.site.id, customer.id);
  redirect(safeNext(form.get("next")));
}

export async function customerSignup(_prev: AuthState | undefined, form: FormData): Promise<AuthState> {
  const ctx = await store();
  if (!ctx) return { message: "Las cuentas de cliente no están disponibles en esta tienda." };
  const parsed = SignupSchema.safeParse({
    fullName: form.get("fullName"), phone: form.get("phone") || undefined, email: form.get("email"), password: form.get("password"),
  });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };

  const rl = rateLimit(`signup:${ctx.site.id}:${parsed.data.email}`, 5, 10 * 60_000);
  if (!rl.ok) return { message: "Demasiados intentos. Espera unos minutos." };

  const next = safeNext(form.get("next"));
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone ?? null },
      emailRedirectTo: storeUrl(ctx.host, `/cuenta/callback?next=${encodeURIComponent(next)}`),
    },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { message: "Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña." };
    }
    return { message: "No pudimos crear tu cuenta. Intenta de nuevo." };
  }

  // Con confirmación por correo apagada, Supabase ya devuelve sesión: entramos directo.
  if (data.session && data.user?.email) {
    const customer = await ensureCustomer(ctx.site.id, { id: data.user.id, email: data.user.email, fullName: parsed.data.fullName, phone: parsed.data.phone });
    await mergeGuestCart(ctx.site.id, customer.id);
    redirect(next);
  }
  // Supabase devuelve un usuario "fantasma" sin identidades cuando el correo ya existe
  // (para no revelar cuentas). El mensaje cubre los dos casos.
  const identities = (data.user as { identities?: unknown[] } | null)?.identities;
  if (Array.isArray(identities) && identities.length === 0) {
    return { message: "Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña." };
  }
  return { ok: true, message: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y listo." };
}

export async function customerRecover(_prev: AuthState | undefined, form: FormData): Promise<AuthState> {
  const ctx = await store();
  if (!ctx) return { message: "Las cuentas de cliente no están disponibles en esta tienda." };
  const parsed = RecoverSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  const rl = rateLimit(`recover:${ctx.site.id}:${parsed.data.email}`, 3, 10 * 60_000);
  if (!rl.ok) return { message: "Ya te enviamos un correo. Revisa tu bandeja (y el spam)." };

  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: storeUrl(ctx.host, "/cuenta/callback?next=%2Fmi-cuenta%2Fcontrasena"),
  });
  // Siempre el mismo mensaje, exista o no la cuenta.
  return { ok: true, message: "Si el correo tiene cuenta, te enviamos instrucciones para cambiar la contraseña." };
}

export async function customerSetPassword(_prev: AuthState | undefined, form: FormData): Promise<AuthState> {
  const ctx = await store();
  if (!ctx) return { message: "No disponible." };
  const parsed = PasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: "No pudimos cambiar la contraseña. Vuelve a pedir el correo de recuperación." };
  return { ok: true, message: "Contraseña actualizada." };
}

export async function customerUpdateProfile(_prev: AuthState | undefined, form: FormData): Promise<AuthState> {
  const ctx = await store();
  if (!ctx) return { message: "No disponible." };
  const session = await getCustomerSession(ctx.site.id);
  if (!session) redirect("/cuenta/login");
  const fullName = String(form.get("fullName") ?? "").trim().slice(0, 120);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 30);
  if (fullName.length < 2) return { errors: { fullName: "Escribe tu nombre." } };
  const { db } = await import("@/lib/db");
  const { customers } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(customers).set({ fullName, phone: phone || null }).where(eq(customers.id, session.customer.id));
  return { ok: true, message: "Datos guardados." };
}

export async function customerSignOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}
