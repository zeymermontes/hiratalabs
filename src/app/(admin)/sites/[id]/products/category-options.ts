import type { CategoryNode } from "@/modules/catalog/queries";
import type { CategoryOption } from "./product-form";

/** Árbol → lista plana con profundidad, para selects y checkboxes. */
export function flattenCategories(tree: CategoryNode[], depth = 0, out: CategoryOption[] = []): CategoryOption[] {
  for (const n of tree) {
    out.push({ id: n.id, name: n.name, depth });
    flattenCategories(n.children, depth + 1, out);
  }
  return out;
}
