import { sanitizeHtml } from "@/components/storefront/sections";
import { str, type SectionProps } from "../../types";
import { SectionHead } from "./shared";

export function CustomHtmlSection({ section }: SectionProps) {
  const html = str(section.settings, "html");
  if (!html) return null;
  return (
    <section className="sf-section sf-chtml">
      <div className="sf-wrap">
        <SectionHead title={str(section.settings, "title")} />
        <div className="sf-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
      </div>
    </section>
  );
}
