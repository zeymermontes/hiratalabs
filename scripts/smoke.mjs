// Pure-logic smoke test: no database, no network.
// Run with: node --experimental-strip-types scripts/smoke.mjs  (or via npm run smoke)
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";

process.env.ROOT_DOMAIN = "hiratalabs.com";
process.env.ADMIN_HOST = "admin.hiratalabs.com";
process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/db";

const { extractZip } = await import("../src/lib/zip.ts");
const { injectIntoHtml, replacePlaceholders } = await import("../src/lib/inject.ts");
const { publicSiteConfig } = await import("../src/lib/settings.ts");
const { slugFromHost, isAdminHost, normalizeHost } = await import("../src/lib/host.ts");
const { SITE_RUNTIME } = await import("../src/lib/runtime.ts");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${err.message}`);
    process.exitCode = 1;
  }
}

/* ------------------------------- hosts ---------------------------------- */

test("normalizes hosts with port and trailing dot", () => {
  assert.equal(normalizeHost("ACME.hiratalabs.com:3000."), "acme.hiratalabs.com");
});

test("maps the apex and www to the home site", () => {
  assert.equal(slugFromHost("hiratalabs.com"), "www");
  assert.equal(slugFromHost("www.hiratalabs.com"), "www");
  assert.equal(isAdminHost("hiratalabs.com"), false);
});

test("extracts slug from subdomain", () => {
  assert.equal(slugFromHost("acme.hiratalabs.com"), "acme");
  assert.equal(slugFromHost("acme.localhost"), "acme");
  assert.equal(slugFromHost("cliente.com"), null);
  assert.equal(slugFromHost("a.b.hiratalabs.com"), null);
});

test("recognizes the admin host", () => {
  assert.equal(isAdminHost("admin.hiratalabs.com"), true);
  assert.equal(isAdminHost("acme.hiratalabs.com"), false);
});

/* -------------------------------- zip ----------------------------------- */

function zip(files) {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

test("extracts a flat archive", () => {
  const r = extractZip(zip({ "index.html": "<h1>hi</h1>", "assets/a.css": "body{}" }), 100);
  assert.equal(r.files.length, 2);
  assert.equal(r.strippedRoot, null);
  assert.ok(r.files.some((f) => f.path === "index.html"));
});

test("strips a single wrapping folder", () => {
  const r = extractZip(zip({ "landing/index.html": "<h1>hi</h1>", "landing/style.css": "" }), 100);
  assert.equal(r.strippedRoot, "landing");
  assert.ok(r.files.some((f) => f.path === "index.html"));
});

test("rejects an archive with no index.html", () => {
  assert.throws(() => extractZip(zip({ "about.html": "x" }), 100), /index\.html/);
});

test("drops zip-slip paths and disallowed extensions", () => {
  const r = extractZip(zip({
    "index.html": "<h1>hi</h1>",
    "../../etc/passwd": "root",
    "server.php": "<?php ?>",
    "__MACOSX/._index.html": "junk",
  }), 100);
  assert.deepEqual(r.files.map((f) => f.path).sort(), ["index.html"]);
  assert.ok(r.skipped.some((s) => s.includes("server.php")));
});

test("enforces the file-count limit", () => {
  const many = { "index.html": "x" };
  for (let i = 0; i < 20; i++) many[`p${i}.html`] = "x";
  assert.throws(() => extractZip(zip(many), 5), /over the 5 limit/);
});

/* ------------------------------ injection -------------------------------- */

const config = publicSiteConfig(
  { id: "s1", name: "ACME", slug: "acme" },
  {
    brandName: "ACME", email: "hola@acme.com", phone: "+52 55 1234 5678",
    whatsapp: "+52 55 8765 4321", address: "Reforma 123",
    socials: { instagram: "https://instagram.com/acme" },
    formRecipients: ["ventas@acme.com"], formSubject: "", custom: { horario: "9-18" },
  },
  "acme.hiratalabs.com",
);

test("builds hrefs from raw contact values", () => {
  assert.equal(config.emailHref, "mailto:hola@acme.com");
  assert.equal(config.phoneHref, "tel:+525512345678");
  assert.equal(config.whatsappHref, "https://wa.me/525587654321");
  assert.ok(config.addressHref.startsWith("https://maps.google.com/?q="));
});

test("replaces placeholders and blanks unknown keys", () => {
  const out = replacePlaceholders("<p>{{site.email}} {{ site.custom.horario }} [{{site.nope}}]</p>", config);
  assert.equal(out, "<p>hola@acme.com 9-18 []</p>");
});

test("escapes HTML inside replaced values", () => {
  const evil = { ...config, brandName: '<script>alert(1)</script>' };
  const out = replacePlaceholders("<h1>{{site.brandName}}</h1>", evil);
  assert.ok(!out.includes("<script>alert"));
  assert.ok(out.includes("&lt;script&gt;"));
});

test("injects config and runtime before </head>", () => {
  const out = injectIntoHtml("<html><head><title>x</title></head><body></body></html>", config);
  assert.ok(out.includes("window.__SITE__="));
  assert.ok(out.includes("__site_runtime__"));
  assert.ok(out.indexOf("__site_config__") < out.indexOf("</head>"));
});

test("injects into a page with no <head>", () => {
  const out = injectIntoHtml("<body><h1>hi</h1></body>", config);
  assert.ok(out.includes("window.__SITE__="));
});

test("cannot break out of the inline script tag", () => {
  const evil = { ...config, address: "</script><script>alert(1)</script>" };
  const out = injectIntoHtml("<head></head>", evil);
  const json = out.slice(out.indexOf("window.__SITE__="), out.indexOf("</script>"));
  assert.ok(!json.includes("</script>"));
  assert.ok(json.includes("\\u003c/script\\u003e"));
});

/* ------------------------------- runtime --------------------------------- */

test("runtime script is syntactically valid", () => {
  new Function(SITE_RUNTIME);
});

console.log(`\n${passed} checks passed`);
