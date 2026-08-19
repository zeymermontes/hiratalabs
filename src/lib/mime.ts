const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  zip: "application/zip",
  map: "application/json; charset=utf-8",
  webmanifest: "application/manifest+json",
};

/** Extensions accepted inside an uploaded ZIP. Everything else is dropped. */
export const ALLOWED_EXTENSIONS = new Set(Object.keys(TYPES).filter((e) => e !== "zip"));

export function extOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

export function contentTypeFor(path: string): string {
  return TYPES[extOf(path)] ?? "application/octet-stream";
}

export function isHtml(path: string): boolean {
  const e = extOf(path);
  return e === "html" || e === "htm";
}
