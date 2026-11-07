/**
 * Lo que se ve mientras llega la siguiente página de la tienda. El encabezado
 * y el pie (del layout) se quedan; solo el contenido cambia a este esqueleto,
 * así el clic en una categoría o un producto responde al instante.
 */
export default function StoreLoading() {
  return (
    <div className="sf-wrap sf-skel" role="status" aria-live="polite">
      <span className="sf-sr">Cargando…</span>
      <div className="sf-skel-line sf-skel-title" />
      <div className="sf-skel-line sf-skel-sub" />
      <div className="sf-skel-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="sf-skel-card">
            <div className="sf-skel-media" />
            <div className="sf-skel-line" />
            <div className="sf-skel-line sf-skel-short" />
          </div>
        ))}
      </div>
    </div>
  );
}
