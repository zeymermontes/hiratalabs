// Corre migraciones SQL de drizzle/ contra DATABASE_URL, llevando registro en
// platform_migrations para no repetirlas. Todas son idempotentes de todos modos.
//   node scripts/migrate.mjs              # todas las pendientes
//   node scripts/migrate.mjs 0009 0010    # solo esas
import { readFileSync, readdirSync, existsSync } from "node:fs";
import postgres from "postgres";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }

const only = process.argv.slice(2);
const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql`create table if not exists platform_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from platform_migrations`).map((r) => r.name));

  // Primera vez: lo que ya existía en la base (0000–0008 de landings) se marca como aplicado.
  if (applied.size === 0) {
    const [{ exists }] = await sql`select exists (select 1 from information_schema.tables where table_name = 'sites') as exists`;
    if (exists) {
      for (const f of files) {
        if (f < "0009") { await sql`insert into platform_migrations (name) values (${f}) on conflict do nothing`; applied.add(f); }
      }
    }
  }

  for (const f of files) {
    if (only.length && !only.some((p) => f.startsWith(p))) continue;
    if (applied.has(f)) { console.log(`· ${f} (ya aplicada)`); continue; }
    process.stdout.write(`→ ${f} … `);
    await sql.unsafe(readFileSync(`drizzle/${f}`, "utf8"));
    await sql`insert into platform_migrations (name) values (${f}) on conflict do nothing`;
    console.log("ok");
  }
  console.log("Migraciones al día.");
} catch (e) {
  console.error("\nERROR:", e.message);
  process.exit(1);
} finally {
  await sql.end();
}
