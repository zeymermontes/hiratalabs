"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar guía" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={copy} className={copied ? "btn-secondary" : "btn-primary"}>
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
