import Link from "next/link";
import type { CategoryNode } from "@/modules/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";
import { bool, str, type CollectionData, type SectionProps } from "../../types";
import { Arrow, colsStyle } from "./shared";

/** Enlaces del listado. En /productos se conservan q, categoria y page; en /categorias/[slug] cada categoría es su propia ruta. */
function linkers(data: CollectionData) {
  const isCatalog = data.basePath === "/productos";
  const catalog = (over: { categoria?: string; page?: number }) => {
    const u = new URLSearchParams();
    const cat = over.categoria ?? data.categoria;
    if (cat) u.set("categoria", cat);
    if (data.q) u.set("q", data.q);
    if (over.page && over.page > 1) u.set("page", String(over.page));
    const qs = u.toString();
    return `/productos${qs ? `?${qs}` : ""}`;
  };
  return {
    isCatalog,
    all: isCatalog ? catalog({ categoria: "", page: 1 }) : "/productos",
    cat: (slug: string) => (isCatalog ? catalog({ categoria: slug, page: 1 }) : `/categorias/${slug}`),
    page: (n: number) => (isCatalog ? catalog({ page: n }) : `${data.basePath}${n > 1 ? `?page=${n}` : ""}`),
  };
}

const contains = (node: CategoryNode, slug: string): boolean => node.slug === slug || node.children.some((c) => contains(c, slug));

function SearchForm({ data }: { data: CollectionData }) {
  return (
    <form className="sf-search sf-cg-search" action="/productos" role="search">
      {data.basePath === "/productos" && data.categoria ? <input type="hidden" name="categoria" value={data.categoria} /> : null}
      <input className="sf-input" type="search" name="q" defaultValue={data.q} placeholder="Buscar productos…" aria-label="Buscar productos" />
      <button type="submit" className="sf-btn sf-btn-ghost">Buscar</button>
    </form>
  );
}

function Pills({ data, l }: { data: CollectionData; l: ReturnType<typeof linkers> }) {
  const { tree, categoria } = data;
  if (tree.length === 0) return null;
  const root = categoria ? tree.find((c) => contains(c, categoria)) : undefined;
  return (
    <div className="sf-cg-pills">
      <nav className="sf-pills" aria-label="Categorías">
        <Link href={l.all} className="sf-pill" aria-current={!categoria}>Todo</Link>
        {tree.map((c) => (
          <Link key={c.id} href={l.cat(c.slug)} className="sf-pill" aria-current={!!categoria && contains(c, categoria)}>{c.name}</Link>
        ))}
      </nav>
      {root && root.children.length > 0 ? (
        <nav className="sf-pills sf-cg-subpills" aria-label="Subcategorías">
          {root.children.map((ch) => (
            <Link key={ch.id} href={l.cat(ch.slug)} className="sf-pill" aria-current={contains(ch, categoria)}>{ch.name}</Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function SideList({ nodes, data, l, depth = 0 }: { nodes: CategoryNode[]; data: CollectionData; l: ReturnType<typeof linkers>; depth?: number }) {
  return (
    <ul className="sf-cg-side-list" data-depth={depth}>
      {nodes.map((c) => {
        const inBranch = !!data.categoria && contains(c, data.categoria);
        return (
          <li key={c.id}>
            <Link href={l.cat(c.slug)} className="sf-cg-side-link" aria-current={data.categoria === c.slug ? "page" : undefined} data-branch={inBranch}>
              {c.name}
            </Link>
            {c.children.length > 0 && (inBranch || depth === 0) ? <SideList nodes={c.children} data={data} l={l} depth={depth + 1} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Pager({ data, l }: { data: CollectionData; l: ReturnType<typeof linkers> }) {
  const { page, pages } = data;
  if (pages <= 1) return null;
  // Ventana de números alrededor de la página actual.
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => from + i);
  return (
    <nav className="sf-pager sf-cg-pager" aria-label="Paginación">
      <span className="sf-muted">Página {page} de {pages}</span>
      <div className="sf-pager-links">
        {page > 1 ? <Link href={l.page(page - 1)} className="sf-cg-pg" aria-label="Página anterior"><Arrow dir="left" /></Link> : null}
        {nums.map((n) => (
          <Link key={n} href={l.page(n)} className="sf-cg-pg" aria-current={n === page ? "page" : undefined}>{n}</Link>
        ))}
        {page < pages ? <Link href={l.page(page + 1)} className="sf-cg-pg" aria-label="Página siguiente"><Arrow /></Link> : null}
      </div>
    </nav>
  );
}

export function CollectionGridSection({ section, collection: data }: SectionProps) {
  if (!data) return null;
  const variant = section.variant === "sidebar" ? "sidebar" : "pills";
  const showSearch = bool(section.settings, "showSearch", true);
  const cols = str(section.settings, "columns", "4") || "4";
  const l = linkers(data);
  const { list, q, categoria } = data;
  const total = list.total;

  const results = list.items.length === 0 ? (
    <div className="sf-empty sf-cg-empty">
      <h2>{l.isCatalog ? "No encontramos productos" : "Aún no hay productos aquí"}</h2>
      <p>{q ? "Prueba con otra palabra." : "Muy pronto habrá novedades aquí."}</p>
      {q || categoria || !l.isCatalog ? <Link href="/productos" className="sf-btn sf-btn-outline">Ver todo el catálogo</Link> : null}
    </div>
  ) : (
    <div className="sf-pg-grid sf-cg-grid" style={colsStyle(cols)}>
      {list.items.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
  const count = <span className="sf-cg-count">{total === 1 ? "1 producto" : `${total.toLocaleString("es-MX")} productos`}</span>;

  if (variant === "sidebar") {
    return (
      <section className="sf-section sf-cg sf-cg--sidebar">
        <div className="sf-wrap">
          <div className="sf-cg-layout">
            <aside className="sf-cg-side" aria-label="Filtros">
              {showSearch ? <SearchForm data={data} /> : null}
              {data.tree.length > 0 ? (
                <nav aria-label="Categorías">
                  <div className="sf-cg-side-title">Categorías</div>
                  <Link href={l.all} className="sf-cg-side-link" aria-current={!categoria ? "page" : undefined}>Todo</Link>
                  <SideList nodes={data.tree} data={data} l={l} />
                </nav>
              ) : null}
            </aside>
            <div className="sf-cg-main">
              <div className="sf-cg-mobile">
                <Pills data={data} l={l} />
                {showSearch ? <SearchForm data={data} /> : null}
              </div>
              <div className="sf-cg-toolbar">{count}</div>
              {results}
              <Pager data={data} l={l} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sf-section sf-cg sf-cg--pills">
      <div className="sf-wrap">
        <div className="sf-cg-bar">
          <Pills data={data} l={l} />
          {showSearch ? <SearchForm data={data} /> : null}
        </div>
        <div className="sf-cg-toolbar">{count}</div>
        {results}
        <Pager data={data} l={l} />
      </div>
    </section>
  );
}
