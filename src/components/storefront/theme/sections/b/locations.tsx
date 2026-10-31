import { str, type SectionProps } from "../../types";
import { FeatureIcon } from "./icons";
import { Arrow, SectionHead } from "./shared";

export function LocationsSection({ section }: SectionProps) {
  const c = section.settings;
  const variant = section.variant ?? "cards";
  const places = (section.blocks ?? [])
    .filter((b) => b.type === "place")
    .map((b) => ({
      id: b.id, name: str(b.settings, "name"), address: str(b.settings, "address"), hours: str(b.settings, "hours"),
      phone: str(b.settings, "phone"), mapUrl: str(b.settings, "mapUrl"),
    }))
    .filter((p) => p.name || p.address);
  if (places.length === 0) return null;
  const title = str(c, "title");
  const safeMap = (u: string) => (/^https?:\/\//i.test(u) ? u : "");

  return (
    <section className={`sf-section sf-loc sf-loc--${variant}`}>
      <div className="sf-wrap">
        <SectionHead title={title} />
        <ul className="sf-loc-list">
          {places.map((p) => {
            const map = safeMap(p.mapUrl);
            const tel = p.phone.replace(/[^\d+]/g, "");
            return (
              <li key={p.id} className="sf-loc-item">
                <div className="sf-loc-head">
                  <span className="sf-loc-pin"><FeatureIcon name="pin" size={20} /></span>
                  {p.name ? <h3 className="sf-loc-name">{p.name}</h3> : null}
                </div>
                <dl className="sf-loc-info">
                  {p.address ? <div><dt>Dirección</dt><dd>{p.address}</dd></div> : null}
                  {p.hours ? <div><dt>Horario</dt><dd>{p.hours}</dd></div> : null}
                  {p.phone ? <div><dt>Teléfono</dt><dd>{tel ? <a href={`tel:${tel}`}>{p.phone}</a> : p.phone}</dd></div> : null}
                </dl>
                {map ? (
                  <a className="sf-loc-map" href={map} target="_blank" rel="noreferrer">
                    Cómo llegar <Arrow dir="up-right" size={16} />
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
