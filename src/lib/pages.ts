function shell(title: string, heading: string, body: string, accent = "#111827") {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #fafafa; color: #111827;
  }
  .card {
    max-width: 480px; width: 100%; text-align: center; background: #fff; padding: 48px 32px;
    border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }
  .dot { width: 44px; height: 44px; border-radius: 999px; background: ${accent}; margin: 0 auto 20px; opacity: .12; }
  h1 { font-size: 20px; margin: 0 0 8px; letter-spacing: -.01em; }
  p { margin: 0; color: #6b7280; font-size: 15px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0b0b0c; color: #f4f4f5; }
    .card { background: #131316; border-color: #26262b; }
    p { color: #a1a1aa; }
  }
</style>
</head>
<body>
  <div class="card">
    <div class="dot"></div>
    <h1>${heading}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function maintenancePage(title?: string | null, message?: string | null) {
  return shell(
    esc(title || "En mantenimiento"),
    esc(title || "En mantenimiento"),
    esc(message || "Estamos haciendo mejoras. Volvemos en un momento."),
    "#f59e0b",
  );
}

export function blockedPage(title?: string | null, message?: string | null) {
  return shell(
    esc(title || "Sitio no disponible"),
    esc(title || "Sitio no disponible"),
    esc(message || "Este sitio no está disponible en este momento."),
    "#ef4444",
  );
}

export function notFoundPage(detail = "La página que buscas no existe.") {
  return shell("404", "Página no encontrada", esc(detail), "#6b7280");
}

export function unconfiguredPage(host: string) {
  return shell(
    "Sitio no configurado",
    "Sitio no configurado",
    `No hay ninguna landing asignada a <strong>${esc(host)}</strong>.`,
    "#6b7280",
  );
}

export function emptySitePage(name: string) {
  return shell(
    "Sin contenido",
    "Todavía no hay contenido",
    `<strong>${esc(name)}</strong> existe pero no tiene una versión publicada.`,
    "#3b82f6",
  );
}
