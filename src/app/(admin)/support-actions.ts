"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin, SUPPORT_COOKIE } from "@/lib/auth";

/**
 * Modo soporte: el super admin ve y edita un sitio con los permisos de su
 * dueño. Dura 2 horas o hasta que lo apaga, y aplica a un solo sitio a la vez.
 */
export async function enterSupport(siteId: string) {
  await requireAdmin();
  (await cookies()).set(SUPPORT_COOKIE, siteId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 2,
  });
  redirect(`/sites/${siteId}`);
}

export async function exitSupport(siteId: string) {
  await requireAdmin();
  (await cookies()).delete(SUPPORT_COOKIE);
  redirect(`/sites/${siteId}`);
}
