import { listBanners } from "@/modules/catalog/queries";
import { str, type SectionProps } from "../../types";
import { Arrow, SectionHead, SmartLink } from "./shared";

export async function BannerStripSection({ ctx, section }: SectionProps) {
  const variant = section.variant ?? "grid";
  const list = await listBanners(ctx.site.id, "strip");
  if (list.length === 0) return null;
  const title = str(section.settings, "title");

  return (
    <section className={`sf-section sf-bs sf-bs--${variant}`}>
      <div className="sf-wrap">
        <SectionHead title={title} />
        <div className="sf-bs-list" data-count={list.length}>
          {list.map((b) => {
            const inner = (
              <>
                <picture className="sf-bs-media">
                  {b.mobileImageUrl ? <source media="(max-width: 639px)" srcSet={b.mobileImageUrl} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.title} loading="lazy" />
                </picture>
                <span className="sf-bs-copy">
                  <strong className="sf-bs-title">{b.title}</strong>
                  {b.subtitle ? <span className="sf-bs-sub">{b.subtitle}</span> : null}
                  {b.linkUrl ? <span className="sf-bs-cta">{b.ctaLabel || "Ver más"} <Arrow size={14} /></span> : null}
                </span>
              </>
            );
            return b.linkUrl
              ? <SmartLink key={b.id} href={b.linkUrl} className="sf-bs-item">{inner}</SmartLink>
              : <div key={b.id} className="sf-bs-item">{inner}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
