// Capturas de las tiendas demo para la landing del producto (public/plantillas/).
// Usa Chrome sin ventana y sharp (ya viene con Next). Herramienta local: córrela
// cuando agregues o cambies una plantilla y sube las imágenes con el código.
//   npm run shoot-templates                    # todas, contra producción
//   npm run shoot-templates -- neon lumen      # solo esas
//   BASE=http://{slug}.localhost:3000 npm run shoot-templates
//   npm run shoot-templates -- --portafolio    # sitios a la medida (public/portafolio/)
//   WAIT=8000 npm run shoot-templates …         # espera más antes de capturar (sitios lentos)
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const { THEME_TEMPLATES } = await import("../src/themes/templates/index.ts");

const BASE = process.env.BASE || "https://{slug}.hiratalabs.com";
const OUT = "public/plantillas";
const { PORTFOLIO } = await import("../src/app/inicio/portfolio.ts");
const portfolio = process.argv.includes("--portafolio");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
mkdirSync(OUT, { recursive: true });
mkdirSync("public/portafolio", { recursive: true });

const port = 9500 + Math.floor(Math.random() * 300);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/shoot-templates-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

let targets = [];
for (let i = 0; i < 40 && !targets.some((t) => t.type === "page"); i++) {
  await new Promise((r) => setTimeout(r, 500));
  targets = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => []);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
// Cada llamada tiene tope de 60 s: si Chrome no contesta, falla en vez de quedarse colgada.
const send = (method, params = {}) => new Promise((r, reject) => {
  const n = ++id;
  const timer = setTimeout(() => { pending.delete(n); reject(new Error(`${method} no respondió`)); }, 60_000);
  pending.set(n, (v) => { clearTimeout(timer); r(v); });
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send("Page.enable");
// Sin animaciones: así todo lo que aparece al hacer scroll sale en la captura.
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

async function shoot(url, width, height, dpr, mobile, clipHeight) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 3000));
  // Recorre la página para que carguen las fotos diferidas (loading="lazy").
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(async () => { for (let y = 0; y < ${clipHeight}; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } scrollTo(0, 0); })()`,
  });
  await new Promise((r) => setTimeout(r, process.env.WAIT ? Number(process.env.WAIT) : 2500));
  const shot = await send("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: clipHeight, scale: 1 },
  });
  return Buffer.from(shot.data, "base64");
}

// Plan B para demos que Chrome no logra capturar de un jalón (fotos grandes a
// pantalla completa): toma tramos del alto de la ventana y los pega. Después del
// primer tramo oculta lo fijo (encabezado) para que no se repita.
//   STITCH=1 npm run shoot-templates -- galeria
async function shootStitched(url, width, height, clipHeight) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 3000));
  const parts = [];
  for (let y = 0; y < clipHeight; y += height) {
    await send("Runtime.evaluate", { expression: `scrollTo(0, ${y})` });
    if (y > 0) await send("Runtime.evaluate", { expression: `document.querySelectorAll("body *").forEach((e) => { const p = getComputedStyle(e).position; if (p === "fixed" || p === "sticky") e.style.visibility = "hidden"; })` });
    await new Promise((r) => setTimeout(r, 1500));
    const shot = await send("Page.captureScreenshot", { format: "png" });
    parts.push({ input: Buffer.from(shot.data, "base64"), top: y, left: 0 });
  }
  return sharp({ create: { width, height: clipHeight, channels: 3, background: "#fff" } })
    .composite(parts.map((p) => ({ ...p, input: p.input }))).png().toBuffer();
}

if (portfolio) {
  for (const p of PORTFOLIO) {
    const desk = await shoot(p.url + "/", 1440, 900, 1, false, 900);
    await sharp(desk).resize(960).webp({ quality: 74 }).toFile(`public/portafolio/${p.shot}.webp`);
    console.log(`✓ ${p.name}`);
  }
}

for (const t of portfolio ? [] : THEME_TEMPLATES) {
  if (only.length && !only.includes(t.key)) continue;
  const url = BASE.replace("{slug}", `demo-${t.key}`) + "/";
  // Escritorio: un tramo largo de la portada, para el efecto de "recorrer" al pasar el cursor.
  try {
    const desk = process.env.STITCH ? await shootStitched(url, 1440, 900, 2700) : await shoot(url, 1440, 900, 1, false, 2700);
    await sharp(desk).resize(960).webp({ quality: 72 }).toFile(`${OUT}/${t.key}-escritorio.webp`);
    // Celular: la primera pantalla.
    const phone = await shoot(url, 390, 844, 2, true, 844);
    await sharp(phone).resize(390).webp({ quality: 76 }).toFile(`${OUT}/${t.key}-celular.webp`);
    console.log(`✓ ${t.key}`);
  } catch (e) {
    console.error(`✗ ${t.key}: ${e.message}`);
    process.exitCode = 1;
  }
}

ws.close();
chrome.kill();
