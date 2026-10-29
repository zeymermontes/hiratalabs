import Link from "next/link";

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", x: "X", linkedin: "LinkedIn", tiktok: "TikTok",
  youtube: "YouTube", threads: "Threads", pinterest: "Pinterest", github: "GitHub", telegram: "Telegram",
};

export function StoreFooter({
  brandName, address, phone, whatsapp, email, socials, modules, poweredBy,
}: {
  brandName: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  socials: Record<string, string>;
  modules: string[];
  poweredBy: { name: string; href: string } | null;
}) {
  const has = (k: string) => modules.includes(k);
  const waDigits = whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const socialEntries = Object.entries(socials).filter(([, v]) => v);

  return (
    <footer className="sf-footer">
      <div className="sf-wrap">
        <div className="sf-footer-grid">
          <div className="sf-footer-col" style={{ gridColumn: "span 1" }}>
            <strong style={{ fontFamily: "var(--sf-font-display)", fontSize: 22 }}>{brandName}</strong>
            {address ? <span className="sf-muted">{address}</span> : null}
          </div>
          <div className="sf-footer-col">
            <strong>Tienda</strong>
            {has("catalog") ? <Link href="/productos">Productos</Link> : null}
            {has("gift_cards") ? <Link href="/gift-cards">Gift cards</Link> : null}
            {has("branches") ? <Link href="/sucursales">Sucursales</Link> : null}
          </div>
          <div className="sf-footer-col">
            <strong>Ayuda</strong>
            {has("faq") ? <Link href="/preguntas-frecuentes">Preguntas frecuentes</Link> : null}
            <Link href="/contacto">Contacto</Link>
            <Link href="/aviso-privacidad">Aviso de privacidad</Link>
          </div>
          <div className="sf-footer-col">
            <strong>Síguenos</strong>
            {waDigits ? <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
            {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a> : null}
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
            {socialEntries.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer">{SOCIAL_LABEL[k] ?? k}</a>
            ))}
          </div>
        </div>
        <div className="sf-footer-bottom">
          <span>© {new Date().getFullYear()} {brandName}</span>
          {poweredBy ? (
            <a className="sf-powered" href={poweredBy.href} target="_blank" rel="noreferrer">
              Tienda hecha con {poweredBy.name}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
