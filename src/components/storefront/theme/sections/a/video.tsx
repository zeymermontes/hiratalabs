import type { SectionProps } from "../../types";
import { str } from "../../types";

/** Solo YouTube y Vimeo; cualquier otro enlace no se inserta. */
export function embedUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const ok = (id: string | null | undefined, re: RegExp) => (id && re.test(id) ? id : null);
  const YT = /^[A-Za-z0-9_-]{6,20}$/;

  if (host === "youtu.be") {
    const id = ok(u.pathname.split("/")[1], YT);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
    const safe = ok(id, YT);
    return safe ? `https://www.youtube-nocookie.com/embed/${safe}` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).find((p) => /^\d{5,12}$/.test(p));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

/** Video de YouTube o Vimeo en 16:9, en caja o de lado a lado. */
export function Video({ section }: SectionProps) {
  const src = embedUrl(str(section.settings, "url"));
  if (!src) return null;
  const title = str(section.settings, "title");
  const variant = section.variant === "full" ? "full" : "contained";

  return (
    <section className={`sf-vid sf-vid--${variant}`}>
      {title ? <div className="sf-wrap"><h2 className="sf-h2 sf-vid-title">{title}</h2></div> : null}
      <div className={variant === "full" ? "sf-vid-outer" : "sf-wrap"}>
        <div className="sf-vid-frame">
          <iframe
            src={src}
            title={title || "Video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}
