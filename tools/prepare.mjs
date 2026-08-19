/**
 * Convierte un export de Claude Design en un sitio listo para la plataforma,
 * aplicando lo que ya aprendimos a mano en portes anteriores. Cada paso reporta
 * qué hizo: nada se cambia en silencio.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function get(url) {
  return execFileSync("curl", ["-sfL", "-A", UA, url], { encoding: "utf8", maxBuffer: 8 << 20 });
}

function download(url, dest) {
  execFileSync("curl", ["-sfL", "-A", UA, url, "-o", dest]);
}

function htmlFiles(root) {
  return readdirSync(root).filter((f) => /\.html?$/i.test(f)).map((f) => join(root, f));
}

function cssFiles(root) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 4) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.name.endsWith(".css")) out.push(full);
    }
  };
  walk(root, 0);
  return out;
}

/* ------------------------------ tipografías ------------------------------ */

/** Extrae la familia, el peso y la URL woff2 del subconjunto latino. */
function parseFontCss(css, baseUrl) {
  const faces = [];
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  const commented = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]*})/g)];

  // Google marca el bloque como "latin"; fontsource usa un slug largo del tipo
  // "cascadia-code-latin-400-normal". Hay que aceptar ambos y excluir latin-ext.
  const isLatin = (label) => {
    if (label === undefined) return true;
    if (label === "latin") return true;
    return /-latin-/.test(label) && !/-latin-ext-/.test(label);
  };

  const consider = (block, subset) => {
    const family = /font-family:\s*['"]([^'"]+)['"]/.exec(block)?.[1];
    const weight = /font-weight:\s*([\d ]+)/.exec(block)?.[1]?.trim() ?? "400";
    const raw = /url\((['"]?)([^)'"]+\.woff2)\1\)/.exec(block)?.[2];
    if (!family || !raw) return;
    if (!isLatin(subset)) return;
    // fontsource sirve "./files/…": resolver contra la URL de la hoja.
    const url = raw.startsWith("http") ? raw : new URL(raw, baseUrl).href;
    faces.push({ family, weight: weight.split(" ")[0], url });
  };

  if (commented.length) commented.forEach((m) => consider(m[2], m[1]));
  else blocks.forEach((b) => consider(b));

  return faces;
}

export function selfHostFonts(siteRoot, report) {
  const htmls = htmlFiles(siteRoot);
  const csses = cssFiles(siteRoot);
  const sources = new Set();

  const CDN = /https:\/\/(?:fonts\.googleapis\.com\/css2\?[^"')]+|cdn\.jsdelivr\.net\/npm\/@fontsource[^"')]+\.css)/g;
  for (const file of [...htmls, ...csses]) {
    for (const m of readFileSync(file, "utf8").matchAll(CDN)) sources.add(m[0]);
  }
  if (sources.size === 0) return;

  const fontsDir = join(siteRoot, "assets", "fonts");
  mkdirSync(fontsDir, { recursive: true });

  const faces = [];
  for (const url of sources) {
    let css;
    try { css = get(url); } catch { report.warn(`No pude leer ${new URL(url).host}; deja el <link> como está.`, "fuentes"); continue; }

    for (const face of parseFontCss(css, url)) {
      const name = `${face.family.replace(/\s+/g, "")}-${face.weight}.woff2`;
      const dest = join(fontsDir, name);
      if (!existsSync(dest)) {
        try { download(face.url, dest); } catch { continue; }
      }
      if (!faces.some((f) => f.file === name)) faces.push({ ...face, file: name });
    }
  }
  if (faces.length === 0) return;

  // Bebas Neue trae un solo corte: declarar el rango evita que el navegador
  // engrose la letra por su cuenta cuando el diseño pide 700 o 900.
  const byFamily = new Map();
  for (const f of faces) {
    if (!byFamily.has(f.family)) byFamily.set(f.family, []);
    byFamily.get(f.family).push(f);
  }

  const declarations = [];
  for (const [family, list] of byFamily) {
    for (const f of list) {
      const weight = list.length === 1 ? "400 900" : f.weight;
      declarations.push(
        `@font-face {\n  font-family: "${family}";\n  src: url("../fonts/${f.file}") format("woff2");\n` +
        `  font-weight: ${weight};\n  font-style: normal;\n  font-display: swap;\n}`,
      );
    }
  }

  const main = csses.sort((a, b) => statSync(b).size - statSync(a).size)[0];
  const header = `/* Tipografías del diseño, autoalojadas: mismas fuentes, sin depender de un CDN. */\n${declarations.join("\n")}\n\n`;
  writeFileSync(main, header + readFileSync(main, "utf8"), "utf8");

  // Quitar los <link> al CDN y precargar lo que entra arriba del pliegue
  const preload = faces.slice(0, 2)
    .map((f) => `<link rel="preload" href="./assets/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`)
    .join("\n");

  for (const file of htmls) {
    let html = readFileSync(file, "utf8");
    html = html
      .replace(/\s*<link[^>]+href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*>/g, "")
      .replace(/\s*<link[^>]+href="https:\/\/cdn\.jsdelivr\.net\/npm\/@fontsource[^"]*"[^>]*>/g, "")
      .replace(/\s*<link[^>]+rel="preconnect"[^>]+fonts\.[^>]*>/g, "");
    if (!html.includes("assets/fonts/") && /<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${preload}\n</head>`);
    }
    writeFileSync(file, html, "utf8");
  }

  for (const file of csses) {
    const css = readFileSync(file, "utf8");
    const cleaned = css.replace(/@import\s+url\((['"]?)https:\/\/(?:fonts\.googleapis|cdn\.jsdelivr)[^)]*\1\);?/g, "");
    if (cleaned !== css) writeFileSync(file, cleaned, "utf8");
  }

  report.note(
    `Fuentes autoalojadas: ${[...byFamily.keys()].join(", ")} (${faces.length} archivo${faces.length === 1 ? "" : "s"}). ` +
    `Se quitaron los <link> al CDN y se agregó preload.`,
  );

  // La familia tiene que ir primero en la pila o el sistema gana
  for (const file of csses) {
    let css = readFileSync(file, "utf8");
    let touched = false;
    for (const family of byFamily.keys()) {
      const re = new RegExp(`(--font-[\\w-]+:\\s*)((?![^;]*"${family}"[^;]*;)[^;]*;)`, "g");
      css = css.replace(re, (full, head, tail) => {
        if (!tail.toLowerCase().includes(family.toLowerCase())) return full;
        touched = true;
        const stack = tail.replace(new RegExp(`["']?${family}["']?,?\\s*`, "i"), "").trim();
        return `${head}"${family}", ${stack}`;
      });
    }
    if (touched) {
      writeFileSync(file, css, "utf8");
      report.note(`Se puso la fuente de marca al frente de la pila en ${relative(siteRoot, file)}.`);
    }
  }
}

/* -------------------------- contacto y formulario ------------------------ */

const CONTACT_PATTERNS = [
  { re: /href="mailto:[^"]*"/g, attr: 'data-site-href="email"', label: "correo" },
  { re: /href="tel:[^"]*"/g, attr: 'data-site-href="phone"', label: "teléfono" },
  { re: /href="(?:https?:)?\/\/(?:api\.whatsapp\.com|wa\.me)[^"]*"/g, attr: 'data-site-href="whatsapp"', label: "WhatsApp" },
];
const SOCIALS = ["instagram", "facebook", "linkedin", "tiktok", "youtube", "threads", "pinterest", "github", "telegram"];

export function wireContacts(siteRoot, report) {
  for (const file of htmlFiles(siteRoot)) {
    let html = readFileSync(file, "utf8");
    const before = html;
    const applied = [];

    for (const { re, attr, label } of CONTACT_PATTERNS) {
      html = html.replace(re, (match) => {
        applied.push(label);
        return attr;
      });
    }
    for (const red of SOCIALS) {
      const re = new RegExp(`href="https?://(?:www\\.)?${red}\\.com[^"]*"`, "g");
      html = html.replace(re, () => {
        applied.push(red);
        return `data-site-href="${red}"`;
      });
    }

    // Un formulario que no está marcado no llega al panel.
    html = html.replace(/<form\b(?![^>]*data-site-form)([^>]*)>/g, (match, attrs) => {
      applied.push("formulario");
      const clean = attrs.replace(/\s*action="[^"]*"/g, "").replace(/\s*method="[^"]*"/g, "");
      return `<form data-site-form="contacto"${clean}>`;
    });

    if (html !== before) {
      writeFileSync(file, html, "utf8");
      report.note(`En ${relative(siteRoot, file)} se conectaron al panel: ${[...new Set(applied)].join(", ")}.`);
    }
  }
}

/* ------------------------------ landing.json ----------------------------- */

function luminance(hex) {
  const n = hex.replace("#", "");
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(hex) {
  const n = hex.replace("#", "");
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Deriva la paleta del chat de las variables :root del propio sitio. */
export function deriveTheme(siteRoot) {
  const csses = cssFiles(siteRoot);
  if (!csses.length) return null;
  const css = readFileSync(csses.sort((a, b) => statSync(b).size - statSync(a).size)[0], "utf8");

  const vars = new Map();
  const root = /:root\s*{([^}]*)}/.exec(css);
  if (root) {
    for (const m of root[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) vars.set(m[1].toLowerCase(), m[2]);
  }
  if (vars.size < 2) return null;

  const entries = [...vars.entries()];
  const pick = (names) => entries.find(([k]) => names.some((n) => k.includes(n)))?.[1];
  const darkest = entries.slice().sort((a, b) => luminance(a[1]) - luminance(b[1]))[0]?.[1];
  const lightest = entries.slice().sort((a, b) => luminance(b[1]) - luminance(a[1]))[0]?.[1];
  const vivid = entries
    .filter(([, v]) => saturation(v) > 0.35 && luminance(v) > 0.08 && luminance(v) < 0.75)
    .sort((a, b) => saturation(b[1]) - saturation(a[1]));

  const ink = pick(["ink", "dark", "black", "navy"]) ?? darkest;
  const surface = pick(["cream", "bone", "light", "paper", "bg"]) ?? lightest;
  const accent = pick(["purple", "violet", "accent", "primary", "brand"]) ?? vivid[0]?.[1] ?? ink;
  const highlight = pick(["lime", "green", "yellow", "secondary"]) ?? vivid[1]?.[1] ?? surface;

  const fontVars = [...css.matchAll(/--font-([\w-]+):\s*([^;]+);/g)];
  const display = fontVars.find(([, name]) => /display|title|heading/.test(name))?.[2]?.trim();
  const body = fontVars.find(([, name]) => /body|text|mono|base/.test(name))?.[2]?.trim();

  return {
    surface, ink, onInk: surface, accent, onAccent: surface, highlight,
    radius: 14, bubbleRadius: 10, launcherShape: "circle",
    ...(body ? { fontFamily: body } : {}),
    ...(display ? { displayFontFamily: display } : {}),
  };
}

export function writeManifest(siteRoot, report) {
  const path = join(siteRoot, "landing.json");
  if (existsSync(path)) return;

  const theme = deriveTheme(siteRoot);
  if (!theme) {
    report.warn("No pude derivar la paleta del CSS; escribe landing.json a mano.", "landing.json");
    return;
  }

  const manifest = {
    chat: {
      launcherLabel: "Cotiza aquí",
      replacesForm: false,
      theme,
      scope: {
        negocio: "TODO: una o dos frases sobre a qué se dedica el negocio.",
        servicios: ["TODO: lo que sí vende"],
        fuera_de_alcance: ["TODO: lo que no vende"],
        no_responder: ["cualquier tema ajeno al proyecto que describe la persona"],
        idioma: "es",
      },
    },
  };
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  report.note(
    `landing.json generado con la paleta del sitio (${theme.ink} / ${theme.accent} / ${theme.highlight}). ` +
    `Completa los TODO de "scope" antes de activar el chat.`,
  );
}
