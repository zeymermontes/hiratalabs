"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { isModuleEnabledById } from "@/lib/modules";
import {
  categories, customizationFields, productCategories, products, productVariants, type ProductImage,
} from "@/modules/catalog/schema";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "active", "archived"] as const;
const FIELD_TYPES = ["text", "textarea", "number", "dropdown", "file"] as const;

function slugify(raw: string) {
  return raw
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "1,234.50" → 123450. Vacío → null. Inválido → NaN. */
function parseMXN(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").replace(/[$,\s]/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function parseInt0(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
}

function parseImages(raw: FormDataEntryValue | null): ProductImage[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u))
      .slice(0, 12)
      .map((url) => ({ url }));
  } catch {
    return [];
  }
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refresh(siteId: string, productId?: string) {
  revalidatePath(`/sites/${siteId}/products`);
  if (productId) revalidatePath(`/sites/${siteId}/products/${productId}`);
}

/** El producto existe y es de este sitio; si no, null. */
async function ownProduct(siteId: string, productId: string) {
  if (!UUID.test(productId)) return null;
  const [p] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.siteId, siteId)));
  return p ?? null;
}

/* ------------------------------------------------------------------ producto */

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, "siteId");
  await requireSiteAccess(siteId);
  const productId = str(form, "productId");

  const name = str(form, "name");
  if (name.length < 2) return { error: "Escribe el nombre del producto." };
  const slug = slugify(str(form, "slug") || name);
  if (slug.length < 2) return { error: "El enlace (slug) queda vacío. Escribe otro." };

  const priceCents = parseMXN(form.get("price"));
  if (priceCents === null || Number.isNaN(priceCents) || priceCents < 0) return { error: "Escribe un precio válido." };
  const compareAtCents = parseMXN(form.get("compareAt"));
  if (compareAtCents !== null && (Number.isNaN(compareAtCents) || compareAtCents < 0)) return { error: "El precio anterior no es válido." };
  const stock = parseInt0(form.get("stock"));
  if (stock !== null && (Number.isNaN(stock) || stock < 0)) return { error: "El inventario debe ser un número entero." };

  const statusRaw = str(form, "status");
  const status = STATUSES.find((s) => s === statusRaw) ?? "draft";

  const categoryIds = form.getAll("categoryIds").map(String).filter((v) => UUID.test(v));
  const values = {
    name, slug,
    description: str(form, "description") || null,
    priceCents,
    compareAtCents: compareAtCents && compareAtCents > priceCents ? compareAtCents : null,
    status,
    images: parseImages(form.get("images")),
    stock,
    sku: str(form, "sku") || null,
    featured: form.get("featured") === "on",
    isCustomizable: form.get("isCustomizable") === "on",
    requiresFile: form.get("requiresFile") === "on",
    updatedAt: new Date(),
  };

  // Slug único por sitio.
  const [clash] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.siteId, siteId), eq(products.slug, slug)));
  if (clash && clash.id !== productId) return { error: `Ya hay un producto con el enlace "${slug}". Cambia el slug.` };

  // Solo categorías de este sitio.
  const ownCats = categoryIds.length
    ? await db.select({ id: categories.id }).from(categories).where(eq(categories.siteId, siteId))
    : [];
  const allowed = new Set(ownCats.map((c) => c.id));
  const cleanCats = categoryIds.filter((c) => allowed.has(c));

  let id = productId;
  if (productId) {
    if (!(await ownProduct(siteId, productId))) return { error: "El producto no existe." };
    await db.update(products).set(values).where(eq(products.id, productId));
  } else {
    const [created] = await db.insert(products).values({ siteId, ...values }).returning({ id: products.id });
    id = created.id;
  }

  await db.delete(productCategories).where(eq(productCategories.productId, id));
  if (cleanCats.length) {
    await db.insert(productCategories).values(cleanCats.map((categoryId) => ({ productId: id, categoryId }))).onConflictDoNothing();
  }

  refresh(siteId, id);
  if (!productId) redirect(`/sites/${siteId}/products/${id}?created=1`);
  return { ok: true, message: "Guardado." };
}

export async function deleteProduct(siteId: string, productId: string) {
  await requireSiteAccess(siteId, { manage: true });
  if (!(await ownProduct(siteId, productId))) return;
  await db.delete(products).where(eq(products.id, productId));
  refresh(siteId);
  redirect(`/sites/${siteId}/products`);
}

export async function toggleFeatured(siteId: string, productId: string, featured: boolean) {
  await requireSiteAccess(siteId);
  if (!(await ownProduct(siteId, productId))) return;
  await db.update(products).set({ featured, updatedAt: new Date() }).where(eq(products.id, productId));
  refresh(siteId, productId);
}

export async function setProductStatus(siteId: string, productId: string, status: string) {
  await requireSiteAccess(siteId);
  const s = STATUSES.find((x) => x === status);
  if (!s || !(await ownProduct(siteId, productId))) return;
  await db.update(products).set({ status: s, updatedAt: new Date() }).where(eq(products.id, productId));
  refresh(siteId, productId);
}

/* ----------------------------------------------------------------- variantes */

export async function saveVariant(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, "siteId");
  await requireSiteAccess(siteId);
  const productId = str(form, "productId");
  const variantId = str(form, "variantId");
  if (!(await ownProduct(siteId, productId))) return { error: "El producto no existe." };

  const name = str(form, "name");
  if (!name) return { error: "Escribe el nombre de la opción (p. ej. Chico, Rojo)." };
  const priceDeltaCents = parseMXN(form.get("priceDelta")) ?? 0;
  if (Number.isNaN(priceDeltaCents)) return { error: "La diferencia de precio no es válida." };
  const stock = parseInt0(form.get("stock"));
  if (stock !== null && (Number.isNaN(stock) || stock < 0)) return { error: "El inventario debe ser un número entero." };
  const values = { name, priceDeltaCents, sku: str(form, "sku") || null, stock };

  if (variantId) {
    await db.update(productVariants).set(values)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
  } else {
    const [last] = await db.select({ sortOrder: productVariants.sortOrder }).from(productVariants)
      .where(eq(productVariants.productId, productId)).orderBy(desc(productVariants.sortOrder)).limit(1);
    await db.insert(productVariants).values({ productId, ...values, sortOrder: (last?.sortOrder ?? -1) + 1 });
  }
  refresh(siteId, productId);
  return { ok: true, message: variantId ? "Opción guardada." : "Opción agregada." };
}

export async function deleteVariant(siteId: string, productId: string, variantId: string) {
  await requireSiteAccess(siteId);
  if (!(await ownProduct(siteId, productId))) return;
  await db.delete(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
  refresh(siteId, productId);
}

/** Intercambia una fila con su vecina y devuelve el orden nuevo (o null si no hay cambio). */
function swapped(ids: string[], rowId: string, dir: -1 | 1): string[] | null {
  const i = ids.indexOf(rowId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export async function moveVariant(siteId: string, productId: string, variantId: string, dir: -1 | 1) {
  await requireSiteAccess(siteId);
  if (!(await ownProduct(siteId, productId))) return;
  const rows = await db.select({ id: productVariants.id }).from(productVariants)
    .where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.sortOrder));
  const ids = swapped(rows.map((r) => r.id), variantId, dir);
  if (!ids) return;
  await Promise.all(ids.map((id, idx) => db.update(productVariants).set({ sortOrder: idx }).where(eq(productVariants.id, id))));
  refresh(siteId, productId);
}

/* --------------------------------------------------- personalización (extra) */

async function customizationAllowed(siteId: string) {
  return isModuleEnabledById(siteId, "product_customization");
}

export async function saveCustomizationField(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, "siteId");
  await requireSiteAccess(siteId);
  if (!(await customizationAllowed(siteId))) return { error: "La personalización de producto no está activa en este sitio." };
  const productId = str(form, "productId");
  const fieldId = str(form, "fieldId");
  if (!(await ownProduct(siteId, productId))) return { error: "El producto no existe." };

  const typeRaw = str(form, "type");
  const type = FIELD_TYPES.find((t) => t === typeRaw);
  if (!type) return { error: "Tipo de campo desconocido." };
  const label = str(form, "label");
  if (!label) return { error: "Escribe la etiqueta que verá el cliente." };
  const name = slugify(str(form, "name") || label).replace(/-/g, "_");
  if (!name) return { error: "La clave interna queda vacía." };

  let options: { value: string; label: string; priceDeltaCents?: number }[] | null = null;
  if (type === "dropdown") {
    options = String(form.get("options") ?? "")
      .split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      .map((line) => {
        // "Etiqueta | +50" → label, delta en MXN opcional.
        const [lbl, delta] = line.split("|").map((s) => s.trim());
        const cents = delta ? parseMXN(delta) : null;
        const value = slugify(lbl).replace(/-/g, "_") || lbl;
        return cents && !Number.isNaN(cents) ? { value, label: lbl, priceDeltaCents: cents } : { value, label: lbl };
      });
    if (options.length === 0) return { error: "Agrega al menos una opción (una por línea)." };
  }
  const variantIds = form.getAll("variantIds").map(String).filter((v) => UUID.test(v));

  const values = { type, name, label, required: form.get("required") === "on", options, variantIds: variantIds.length ? variantIds : null };

  const [clash] = await db.select({ id: customizationFields.id }).from(customizationFields)
    .where(and(eq(customizationFields.productId, productId), eq(customizationFields.name, name)));
  if (clash && clash.id !== fieldId) return { error: `Ya hay un campo con la clave "${name}".` };

  if (fieldId) {
    await db.update(customizationFields).set(values)
      .where(and(eq(customizationFields.id, fieldId), eq(customizationFields.productId, productId)));
  } else {
    const [last] = await db.select({ sortOrder: customizationFields.sortOrder }).from(customizationFields)
      .where(eq(customizationFields.productId, productId)).orderBy(desc(customizationFields.sortOrder)).limit(1);
    await db.insert(customizationFields).values({ productId, ...values, sortOrder: (last?.sortOrder ?? -1) + 1 });
  }
  // Con campos, el producto es personalizable.
  await db.update(products).set({ isCustomizable: true, updatedAt: new Date() }).where(eq(products.id, productId));
  refresh(siteId, productId);
  return { ok: true, message: fieldId ? "Campo guardado." : "Campo agregado." };
}

export async function deleteCustomizationField(siteId: string, productId: string, fieldId: string) {
  await requireSiteAccess(siteId);
  if (!(await ownProduct(siteId, productId))) return;
  await db.delete(customizationFields).where(and(eq(customizationFields.id, fieldId), eq(customizationFields.productId, productId)));
  refresh(siteId, productId);
}

export async function moveCustomizationField(siteId: string, productId: string, fieldId: string, dir: -1 | 1) {
  await requireSiteAccess(siteId);
  if (!(await ownProduct(siteId, productId))) return;
  const rows = await db.select({ id: customizationFields.id }).from(customizationFields)
    .where(eq(customizationFields.productId, productId)).orderBy(asc(customizationFields.sortOrder));
  const ids = swapped(rows.map((r) => r.id), fieldId, dir);
  if (!ids) return;
  await Promise.all(ids.map((id, idx) => db.update(customizationFields).set({ sortOrder: idx }).where(eq(customizationFields.id, id))));
  refresh(siteId, productId);
}

/* ---------------------------------------------------------------- categorías */

export async function saveCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, "siteId");
  await requireSiteAccess(siteId);
  const categoryId = str(form, "categoryId");

  const name = str(form, "name");
  if (name.length < 2) return { error: "Escribe el nombre de la categoría." };
  const slug = slugify(str(form, "slug") || name);
  if (slug.length < 2) return { error: "El enlace (slug) queda vacío." };
  const parentRaw = str(form, "parentId");
  let parentId: string | null = UUID.test(parentRaw) ? parentRaw : null;
  if (parentId && parentId === categoryId) parentId = null;
  if (parentId) {
    const [p] = await db.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, parentId), eq(categories.siteId, siteId)));
    if (!p) parentId = null;
  }
  const sortOrder = parseInt0(form.get("sortOrder")) ?? 0;
  const imageUrl = str(form, "imageUrl");

  const values = {
    name, slug, parentId,
    description: str(form, "description") || null,
    sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    imageUrl: /^https?:\/\//.test(imageUrl) ? imageUrl : null,
    showInHeader: form.get("showInHeader") === "on",
  };

  const [clash] = await db.select({ id: categories.id }).from(categories)
    .where(and(eq(categories.siteId, siteId), eq(categories.slug, slug)));
  if (clash && clash.id !== categoryId) return { error: `Ya hay una categoría con el enlace "${slug}".` };

  if (categoryId) {
    await db.update(categories).set(values).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId)));
  } else {
    await db.insert(categories).values({ siteId, ...values });
  }
  revalidatePath(`/sites/${siteId}/categories`);
  revalidatePath(`/sites/${siteId}/products`);
  return { ok: true, message: categoryId ? "Categoría guardada." : "Categoría creada." };
}

export async function deleteCategory(siteId: string, categoryId: string) {
  await requireSiteAccess(siteId, { manage: true });
  // Las hijas suben al nivel de la que se borra.
  await db.update(categories).set({ parentId: null })
    .where(and(eq(categories.siteId, siteId), eq(categories.parentId, categoryId)));
  await db.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId)));
  revalidatePath(`/sites/${siteId}/categories`);
  revalidatePath(`/sites/${siteId}/products`);
}
