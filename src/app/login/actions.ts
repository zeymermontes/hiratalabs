"use server";

import { isAllowedAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

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
    options: { emailRedirectTo: `${env.adminUrl}/auth/callback`, shouldCreateUser: true },
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
}
