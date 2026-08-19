"use server";

import { headers } from "next/headers";
import { isAllowedAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Send the magic link back to whatever host the person is actually using, so
 * login works from the Render URL before the custom domain's DNS exists.
 */
async function callbackUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return `${env.adminUrl}/auth/callback`;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/auth/callback`;
}

export type LoginState = { ok?: boolean; error?: string };

export async function requestMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return { error: "Escribe un correo válido." };
  }

  if (!(await isAllowedAdmin(email))) {
    // Deliberately vague: don't reveal who is on the allowlist.
    return { error: "Ese correo no tiene acceso al panel." };
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl(), shouldCreateUser: true },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
}
