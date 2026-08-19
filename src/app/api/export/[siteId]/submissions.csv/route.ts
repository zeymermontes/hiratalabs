import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites, submissions } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!(await getAdminUser())) return new NextResponse("Unauthorized", { status: 401 });

  const { siteId } = await params;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return new NextResponse("Not found", { status: 404 });

  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.siteId, siteId))
    .orderBy(desc(submissions.createdAt));

  const extraKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.data))));
  const header = ["fecha", "formulario", "nombre", "email", "telefono", "mensaje", "estado_email", "url", "ip", ...extraKeys];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.createdAt.toISOString(), r.formName, r.name, r.email, r.phone, r.message,
      r.emailStatus, r.pageUrl, r.ip,
      ...extraKeys.map((k) => r.data[k] ?? ""),
    ].map(cell).join(","));
  }

  return new NextResponse("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${site.slug}-mensajes.csv"`,
    },
  });
}
