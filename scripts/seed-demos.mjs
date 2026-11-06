// Crea o actualiza una tienda demo por plantilla (demo-<plantilla>.<dominio>):
// catálogo de ejemplo del giro, fotos de Pixabay o Pexels (PIXABAY_API_KEY o
// PEXELS_API_KEY) y el
// tema de la plantilla publicado. Idempotente: re-correrlo rehace el catálogo
// de las demos, nunca toca otras tiendas.
//   npm run seed-demos               # todas
//   npm run seed-demos -- lumen neon # solo esas
import { readFileSync, existsSync } from "node:fs";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

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

const { THEME_TEMPLATES } = await import("../src/themes/templates/index.ts");
const { docFromTemplate } = await import("../src/themes/resolve.ts");
const { DEMO_CATALOG } = await import("../src/themes/demo-catalog.ts");

const DEMO_NOTE = "Tienda demo de plantilla (generada por seed-demos).";
const PEXELS = process.env.PEXELS_API_KEY;
const PIXABAY = process.env.PIXABAY_API_KEY;
const BUCKET = process.env.SUPABASE_PUBLIC_BUCKET || "store-assets";
const only = process.argv.slice(2);

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const sb = PIXABAY || PEXELS ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null;

const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Resultados de búsqueda como [{ src, alt }], de Pixabay o de Pexels (el que tenga llave). */
async function search(query, count, orientation) {
  if (PIXABAY) {
    // Pixabay pide descargar las fotos y servirlas desde tu propio almacenamiento: justo lo que se hace aquí.
    const u = new URL("https://pixabay.com/api/");
    u.searchParams.set("key", PIXABAY);
    u.searchParams.set("q", query);
    u.searchParams.set("image_type", "photo");
    u.searchParams.set("safesearch", "true");
    u.searchParams.set("per_page", String(Math.max(3, Math.min(count, 200))));
    u.searchParams.set("orientation", orientation === "landscape" ? "horizontal" : "vertical");
    const res = await fetch(u);
    if (!res.ok) { console.warn(`   ! Pixabay respondió ${res.status} para "${query}"`); return []; }
    const data = await res.json();
    return (data.hits ?? []).slice(0, count).map((h) => ({ src: h.largeImageURL, alt: h.tags }));
  }
  const u = new URL("https://api.pexels.com/v1/search");
  u.searchParams.set("query", query);
  u.searchParams.set("per_page", String(Math.min(count, 40)));
  if (orientation) u.searchParams.set("orientation", orientation);
  const res = await fetch(u, { headers: { Authorization: PEXELS } });
  if (!res.ok) { console.warn(`   ! Pexels respondió ${res.status} para "${query}"`); return []; }
  const data = await res.json();
  return (data.photos ?? []).map((p) => ({ src: orientation === "landscape" ? p.src.large2x : p.src.large, alt: p.alt }));
}

/** Busca fotos, las sube al bucket público y devuelve sus URLs. */
async function photos(templateKey, label, query, count, orientation) {
  if (!(PIXABAY || PEXELS) || count <= 0) return [];
  const out = [];
  for (const [i, p] of (await search(query, count, orientation)).entries()) {
    const src = p.src;
    const img = await fetch(src);
    if (!img.ok) continue;
    const path = `demos/${templateKey}/${slugify(label)}-${i + 1}.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(path, Buffer.from(await img.arrayBuffer()), { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
    if (error) { console.warn(`   ! No se pudo subir ${path}: ${error.message}`); continue; }
    out.push({ url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, alt: label });
  }
  return out;
}

/** Pone fotos de ambiente en las secciones del tema que piden imagen. */
function fillThemeImages(doc, scene, catPhotos) {
  let i = 0;
  const next = () => scene.length ? scene[i++ % scene.length].url : "";
  for (const list of Object.values(doc.pages)) {
    for (const s of list) {
      if (s.type === "hero") {
        if (!s.settings.image) s.settings.image = next();
        (s.blocks ?? []).forEach((b, bi) => { if (!b.settings.image) b.settings.image = catPhotos[bi % Math.max(catPhotos.length, 1)]?.url ?? next(); });
      }
      if ((s.type === "image_text" || (s.type === "cta_band" && s.variant === "split") || s.type === "collection_header") && !s.settings.image) s.settings.image = next();
      if (s.type === "gallery") (s.blocks ?? []).forEach((b) => { if (!b.settings.image) b.settings.image = next(); });
    }
  }
  return doc;
}

async function seed(t) {
  const cat = DEMO_CATALOG[t.demo];
  if (!cat) { console.warn(`· ${t.key}: no hay catálogo demo "${t.demo}", se omite`); return; }
  const slug = `demo-${t.key}`;
  console.log(`→ ${slug} (${cat.brand})`);

  const [existing] = await sql`select id, notes from sites where slug = ${slug}`;
  if (existing && existing.notes !== DEMO_NOTE) { console.warn(`   ! ${slug} existe y no es una demo; no se toca`); return; }

  const [site] = existing
    ? await sql`update sites set name = ${cat.brand}, kind = 'store', status = 'live', theme = ${sql.json({ template: t.key })}, updated_at = now() where id = ${existing.id} returning id`
    : await sql`insert into sites (name, slug, status, kind, theme, notes) values (${cat.brand}, ${slug}, 'live', 'store', ${sql.json({ template: t.key })}, ${DEMO_NOTE}) returning id`;

  // Fotos: una búsqueda por categoría (dos por producto: principal y segunda foto) y una de ambiente.
  const perCat = cat.categories.map((_, ci) => cat.products.filter((p) => p[2] === ci).length);
  const catPhotos = [];
  const productPhotos = [];
  for (const [ci, c] of cat.categories.entries()) {
    const list = await photos(t.key, c.name, c.query, perCat[ci] * 2 + 1, "portrait");
    catPhotos.push(list[0]);
    productPhotos.push(list.slice(1));
  }
  const scene = await photos(t.key, "ambiente", cat.scene, 10, "landscape");

  await sql.begin(async (tx) => {
    await tx`delete from products where site_id = ${site.id}`;
    await tx`delete from categories where site_id = ${site.id}`;
    const catIds = [];
    for (const [ci, c] of cat.categories.entries()) {
      const [row] = await tx`insert into categories (site_id, slug, name, sort_order, image_url, show_in_header)
        values (${site.id}, ${slugify(c.name)}, ${c.name}, ${ci}, ${catPhotos[ci]?.url ?? null}, true) returning id`;
      catIds.push(row.id);
    }
    const used = cat.categories.map(() => 0);
    for (const [pi, [name, price, ci, description, compareAt]] of cat.products.entries()) {
      const pool = productPhotos[ci] ?? [];
      const imgs = [pool[used[ci]], pool[used[ci] + 1]].filter(Boolean);
      used[ci] += 2;
      const [p] = await tx`insert into products (site_id, slug, name, description, price_cents, compare_at_cents, status, images, featured, sort_order)
        values (${site.id}, ${slugify(name)}, ${name}, ${description}, ${Math.round(price * 100)}, ${compareAt ? Math.round(compareAt * 100) : null},
                'active', ${tx.json(imgs)}, ${pi % 2 === 0}, ${pi}) returning id`;
      await tx`insert into product_categories (product_id, category_id) values (${p.id}, ${catIds[ci]})`;
    }

    const doc = fillThemeImages(docFromTemplate(t.key), scene, catPhotos.filter(Boolean));
    await tx`delete from theme_versions where site_id = ${site.id}`;
    await tx`insert into theme_versions (site_id, status, doc, label, published_at) values (${site.id}, 'published', ${tx.json(doc)}, 'Demo', now())`;
  });
  console.log(`   ok · ${cat.products.length} productos · ${PIXABAY || PEXELS ? `${scene.length} fotos de ambiente` : "sin fotos (falta PIXABAY_API_KEY)"}`);
}

try {
  for (const t of THEME_TEMPLATES) {
    if (only.length && !only.includes(t.key)) continue;
    await seed(t);
  }
  console.log("Demos listas.");
} catch (e) {
  console.error("\nERROR:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
