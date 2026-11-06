// Valida el catálogo de plantillas: secciones, variantes, zonas, bloques,
// colores, fuentes y contraste. Sin base de datos ni red.
// Uso: npm run check-themes   (corre también antes de publicar una plantilla nueva)
const { THEME_TEMPLATES } = await import("../src/themes/templates/index.ts");
const { SECTION_BY_TYPE } = await import("../src/themes/sections.ts");
const { FONT_BY_NAME } = await import("../src/themes/fonts.ts");
const { SCHEME_KEYS } = await import("../src/themes/types.ts");
const { normalizeDoc, docFromTemplate } = await import("../src/themes/resolve.ts");

const errors = [];
const warns = [];
const HEX = /^#([0-9a-f]{6})$/i;

function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const keys = new Set();
for (const t of THEME_TEMPLATES) {
  const at = (msg) => `${t.key}: ${msg}`;
  if (keys.has(t.key)) errors.push(at("clave repetida"));
  keys.add(t.key);
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(t.key)) errors.push(at("la clave debe ser minúsculas, números o guiones"));
  if (t.doc.template !== t.key) errors.push(at(`doc.template (${t.doc.template}) no coincide con la clave`));
  if (!t.styles.length) errors.push(at("necesita al menos un estilo"));
  if (t.highlights.length < 2) warns.push(at("pon 2 o 3 rasgos en highlights"));

  const st = t.doc.settings;
  for (const f of [st.fonts.display, st.fonts.body]) if (!FONT_BY_NAME[f]) errors.push(at(`fuente fuera del catálogo: ${f}`));

  const checkSchemes = (schemes, where) => {
    for (const k of SCHEME_KEYS) {
      const s = schemes[k];
      if (!s) { errors.push(at(`${where}: falta el esquema ${k}`)); continue; }
      for (const [name, v] of Object.entries(s)) if (!HEX.test(v)) errors.push(at(`${where}.${k}.${name} no es un color #rrggbb: ${v}`));
      if (HEX.test(s.fg) && HEX.test(s.bg) && contrast(s.fg, s.bg) < 4.5) errors.push(at(`${where}.${k}: texto sobre fondo con contraste ${contrast(s.fg, s.bg).toFixed(2)} (mínimo 4.5)`));
      if (HEX.test(s.primary) && HEX.test(s.primaryFg) && contrast(s.primary, s.primaryFg) < 3) errors.push(at(`${where}.${k}: botón principal con contraste ${contrast(s.primary, s.primaryFg).toFixed(2)} (mínimo 3)`));
    }
  };
  checkSchemes(st.schemes, "esquemas");
  for (const style of t.styles) checkSchemes(docFromTemplate(t.key, style.key).settings.schemes, `estilo ${style.key}`);

  const zones = { header: t.doc.groups.header, footer: t.doc.groups.footer, ...t.doc.pages };
  for (const [zone, list] of Object.entries(zones)) {
    for (const s of list) {
      const def = SECTION_BY_TYPE[s.type];
      if (!def) { errors.push(at(`${zone}: sección desconocida ${s.type}`)); continue; }
      if (!def.zones.includes(zone)) errors.push(at(`${zone}: ${s.type} no se permite aquí`));
      if (s.variant && !def.variants.some((v) => v.key === s.variant)) errors.push(at(`${zone}: ${s.type} no tiene la variante ${s.variant}`));
      const known = new Set(def.settings.map((d) => d.key));
      for (const k of Object.keys(s.settings)) if (!known.has(k)) warns.push(at(`${zone}: ${s.type} tiene un ajuste que no existe: ${k}`));
      for (const b of s.blocks ?? []) {
        const bd = def.blocks?.types.find((x) => x.type === b.type);
        if (!bd) { errors.push(at(`${zone}: ${s.type} no acepta bloques ${b.type}`)); continue; }
        const bk = new Set(bd.settings.map((d) => d.key));
        for (const k of Object.keys(b.settings)) if (!bk.has(k)) warns.push(at(`${zone}: bloque ${b.type} tiene un ajuste que no existe: ${k}`));
      }
      if (def.blocks && (s.blocks?.length ?? 0) > def.blocks.max) errors.push(at(`${zone}: ${s.type} pasa del máximo de ${def.blocks.max} bloques`));
    }
    for (const def of Object.values(SECTION_BY_TYPE)) {
      if (def.required && def.zones.includes(zone) && !list.some((s) => s.type === def.type)) errors.push(at(`${zone}: falta la sección obligatoria ${def.type}`));
    }
  }

  // El documento debe sobrevivir a la normalización sin perder secciones.
  const n = normalizeDoc(t.doc);
  for (const z of ["home", "product", "collection"]) if (n.pages[z].length < t.doc.pages[z].length) errors.push(at(`${z}: la normalización quitó secciones`));
}

for (const w of warns) console.log(`  aviso  ${w}`);
for (const e of errors) console.log(`  ERROR  ${e}`);
console.log(`\n${THEME_TEMPLATES.length} plantillas · ${errors.length} errores · ${warns.length} avisos`);
process.exit(errors.length ? 1 : 0);
