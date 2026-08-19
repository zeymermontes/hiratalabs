// Lets the app source run under plain node for tests: resolves the "@/..."
// TypeScript path alias and adds the extensions TS lets you omit.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const ROOT = resolvePath(import.meta.dirname, "..");

function withExtension(absolute) {
  if (existsSync(absolute) && statSync(absolute).isFile()) return absolute;
  for (const candidate of [`${absolute}.ts`, `${absolute}.tsx`, `${absolute}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolve(specifier, context, next) {
  let absolute = null;

  if (specifier.startsWith("@/")) {
    absolute = withExtension(resolvePath(ROOT, "src", specifier.slice(2)));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    absolute = withExtension(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
  }

  return absolute ? next(pathToFileURL(absolute).href, context) : next(specifier, context);
}
