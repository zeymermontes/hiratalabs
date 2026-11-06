"use client";

import { useEffect, useState } from "react";

/** Cambia de mensaje cada 4 s; se pausa al pasar el cursor o con el foco. */
export function RotatingMessages({ messages, ms = 4000 }: { messages: string[]; ms?: number }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = messages.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), ms);
    return () => clearInterval(t);
  }, [count, paused, ms]);

  return (
    <div
      className="sf-ann-rot"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {messages.map((m, i) => (
        <p key={i} className="sf-ann-rot-item" data-active={i === idx} aria-hidden={i !== idx}>{m}</p>
      ))}
    </div>
  );
}
