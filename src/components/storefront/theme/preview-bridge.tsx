"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Solo dentro del editor (vista previa del borrador). Mantiene el token de
 * vista previa al navegar por la tienda, recarga cuando el editor guarda y
 * resalta la sección que el dueño está editando.
 */
export function PreviewBridge({ token }: { token: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // Avisa al editor en qué página está la vista previa, también al navegar dentro de ella.
  useEffect(() => {
    window.parent?.postMessage({ type: "sf:ready", path: pathname }, "*");
  }, [pathname]);

  useEffect(() => {
    const keepToken = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank") return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const u = new URL(href, location.origin);
      if (u.searchParams.get("__preview")) return;
      u.searchParams.set("__preview", token);
      e.preventDefault();
      router.push(u.pathname + u.search + u.hash);
    };

    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; id?: string; path?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "sf:reload") router.refresh();
      if (data.type === "sf:navigate" && data.path?.startsWith("/")) {
        const u = new URL(data.path, location.origin);
        u.searchParams.set("__preview", token);
        router.push(u.pathname + u.search);
      }
      if (data.type === "sf:focus" && data.id) {
        document.querySelectorAll(".sf-s[data-focused]").forEach((el) => el.removeAttribute("data-focused"));
        const el = document.getElementById(`s-${data.id}`);
        if (el) {
          el.setAttribute("data-focused", "true");
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    document.addEventListener("click", keepToken, true);
    window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("click", keepToken, true);
      window.removeEventListener("message", onMessage);
    };
  }, [router, token]);

  return null;
}
