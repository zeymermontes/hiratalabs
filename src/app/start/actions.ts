"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { signups, sites } from "@/lib/db/schema";
import { env, RESERVED_SLUGS } from "@/lib/env";
import { rateLimit } from "@/lib/ratelimit";
import { supabaseServer } from "@/lib/supabase/server";
import { TEMPLATE_BY_KEY } from "@/lib/theme";

export type StartState = { ok?: boolean; error?: string; slug?: string };

function slugify(raw: string) {
  return raw
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function callbackUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return `${env.appUrl}/auth/callback`;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/auth/callback`;
}

/** ¿Está abierto el registro público? Se apaga con PUBLIC_SIGNUP=0. */
export async function signupOpen(): Promise<boolean> {
  return (process.env.PUBLIC_SIGNUP ?? "1") !== "0";
}

export async function startSignup(_prev: StartState, form: FormData): Promise<StartState> {
  if (!(await signupOpen())) return { error: "El registro está cerrado por ahora. Escríbenos y te damos acceso." };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (!rateLimit(`signup:${ip}`, 5, 3_600_000).ok) return { error: "Demasiados intentos. Inténtalo más tarde." };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const storeName = String(form.get("storeName") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || storeName);
  const template = String(form.get("template") ?? "lumen");
  const business = String(form.get("business") ?? "").trim().slice(0, 500) || null;

  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { error: "Escribe un correo válido." };
  if (storeName.length < 2) return { error: "Ponle nombre a tu tienda." };
  if (slug.length < 3) return { error: "El subdominio necesita al menos 3 letras." };
  if (RESERVED_SLUGS.has(slug) || slug === "www") return { error: `"${slug}" no está disponible.` };
  if (!TEMPLATE_BY_KEY[template]) return { error: "Elige una plantilla." };

  const [taken] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, slug));
  if (taken) return { error: `${slug}.${env.rootDomain} ya está ocupado. Prueba otro.` };
  const [pendingOther] = await db.select({ id: signups.id, email: signups.email }).from(signups)
    .where(and(eq(signups.slug, slug), eq(signups.status, "pending")));
  if (pendingOther && pendingOther.email !== email) return { error: `${slug}.${env.rootDomain} está apartado. Prueba otro.` };

  // Un registro pendiente por correo: el último gana.
  await db.update(signups).set({ status: "expired" })
    .where(and(eq(signups.email, email), eq(signups.status, "pending")));
  await db.insert(signups).values({ email, storeName, slug, template, business, kind: "store" });

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl(), shouldCreateUser: true },
  });
  if (error) return { error: error.message };
  return { ok: true, slug };
}
