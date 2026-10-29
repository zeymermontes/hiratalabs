/**
 * Formato de dinero para componentes de cliente. Es el mismo que
 * formatMXN de @/lib/storefront, pero sin arrastrar ese módulo (que importa la
 * base de datos) al bundle del navegador.
 */
export function formatMXN(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}
