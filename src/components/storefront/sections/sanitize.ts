/** Quita lo que puede ejecutar código; lo demás se inserta tal cual. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|style|link|meta|base|form)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}
