// Diagnoses a Supabase connection string without printing the password.
//   node scripts/check-db.mjs "postgresql://..."
//   node scripts/check-db.mjs            # reads DATABASE_URL from the environment
import postgres from "postgres";

const raw = process.argv[2] || process.env.DATABASE_URL;

if (!raw) {
  console.error("Pass the connection string as an argument, or set DATABASE_URL.");
  process.exit(1);
}

// Split at the LAST @ so a password containing @ still parses correctly.
const withoutScheme = raw.replace(/^postgres(ql)?:\/\//, "");
const at = withoutScheme.lastIndexOf("@");
const userinfo = at === -1 ? "" : withoutScheme.slice(0, at);
const hostpart = at === -1 ? withoutScheme : withoutScheme.slice(at + 1);
const colon = userinfo.indexOf(":");
const user = colon === -1 ? userinfo : userinfo.slice(0, colon);
const password = colon === -1 ? "" : userinfo.slice(colon + 1);
const [hostport, database = ""] = hostpart.split("/");
const [host, port = "5432"] = hostport.split(":");

console.log("\nParsed as:");
console.log(`  user      ${user || "(empty)"}`);
console.log(`  password  ${password ? `${password.length} characters` : "(empty)"}`);
console.log(`  host      ${host}`);
console.log(`  port      ${port}`);
console.log(`  database  ${database || "(empty)"}`);

const problems = [];

if (host.includes("pooler.supabase.com") && !user.includes(".")) {
  problems.push(
    `The pooler needs the user "postgres.<project-ref>", not "${user}".\n` +
    `    Copy the string from Supabase > Connect > Session pooler — it already has the right user.`,
  );
}
if (/^db\..*\.supabase\.co$/.test(host)) {
  problems.push(
    "This is the Direct connection, which is IPv6-only. Render cannot reach it.\n" +
    "    Use the Session pooler string instead.",
  );
}
if (password.includes("$")) {
  problems.push(
    "The password contains $. In a .env file Next expands it and mangles the value.\n" +
    "    Escape it as \\$ in .env files, or reset the password to something alphanumeric.",
  );
}
if (/[\[\]]/.test(password) || /your.?password/i.test(password)) {
  problems.push(
    "The password is still the placeholder from Supabase's example string.\n" +
    "    Replace [YOUR-PASSWORD] with the real password.",
  );
}
if (/\s/.test(raw)) {
  problems.push("The string contains whitespace — likely a stray space or newline when pasted.");
}
if (password.includes("%")) {
  problems.push("The password contains %, which is percent-encoding. Make sure it is encoded correctly.");
}

if (problems.length) {
  console.log("\nProblems found:");
  problems.forEach((p) => console.log(`  - ${p}`));
}

console.log("\nConnecting…");
try {
  const sql = postgres(raw, { max: 1, prepare: false, connect_timeout: 10 });
  const [row] = await sql`select current_user as who, version() as v`;
  console.log(`  OK — connected as "${row.who}"`);
  console.log(`  ${row.v.split(",")[0]}`);

  // The connection working is only half of it: the schema has to be there too.
  const EXPECTED = [
    "admins", "sites", "site_versions", "site_files",
    "site_settings", "global_settings", "domains", "submissions",
  ];
  const found = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public'
  `;
  const names = new Set(found.map((r) => r.table_name));
  const absent = EXPECTED.filter((t) => !names.has(t));

  console.log("\nSchema:");
  if (absent.length === 0) {
    console.log(`  OK — all ${EXPECTED.length} tables present`);
  } else {
    console.log(`  MISSING ${absent.length} of ${EXPECTED.length}: ${absent.join(", ")}`);
    console.log("  Run drizzle/0000_init.sql in the Supabase SQL Editor.");
    process.exitCode = 1;
  }

  await sql.end();
} catch (err) {
  console.log(`  FAILED — ${err.message}${err.code ? ` (${err.code})` : ""}`);
  if (err.code === "28P01") {
    console.log("\n  28P01 means the credentials were rejected. Most common causes:");
    console.log("   1. The password was reset in Supabase but not updated here.");
    console.log("   2. The user is \"postgres\" instead of \"postgres.<project-ref>\" on the pooler.");
    console.log("   3. The password lost characters to $ expansion in a .env file.");
    console.log("   4. [YOUR-PASSWORD] was pasted literally instead of the real password.");
  }
  process.exitCode = 1;
}
