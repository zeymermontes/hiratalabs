import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the app cannot boot without. */
const REQUIRED = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ROOT_DOMAIN",
  "ADMIN_HOST",
];

/** Never echo a credential back over HTTP, even on an error path. */
function redact(message: string): string {
  return message
    .replace(/:\/\/[^:@\s]+:[^@\s]+@/g, "://***:***@")
    .replace(/(password|apikey|api_key|secret|token)=\S+/gi, "$1=***");
}

export async function GET() {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[health] missing environment variables: ${missing.join(", ")}`);
    return NextResponse.json(
      { ok: false, stage: "env", missing },
      { status: 503 },
    );
  }

  try {
    // Imported lazily so a bad DATABASE_URL surfaces here as JSON rather than
    // throwing at module load and returning an opaque 500.
    const [{ db }, { sql }] = await Promise.all([
      import("@/lib/db"),
      import("drizzle-orm"),
    ]);
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = redact(err instanceof Error ? err.message : String(err));
    console.error(`[health] database unreachable: ${message}`);
    return NextResponse.json(
      {
        ok: false,
        stage: "database",
        error: message,
        hint: "Use the Supabase Session pooler connection string. The Direct connection is IPv6-only and Render cannot reach it.",
      },
      { status: 503 },
    );
  }
}
