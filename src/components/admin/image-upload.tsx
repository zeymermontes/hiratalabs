"use client";

import { useRef, useState } from "react";

/**
 * Subida de imágenes del panel. Manda el archivo a /api/store/upload (que
 * valida el acceso al sitio) y guarda la URL pública en un input oculto para
 * que el server action la reciba como cualquier otro campo del formulario.
 */
async function uploadOne(siteId: string, folder: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.set("siteId", siteId);
  fd.set("folder", folder);
  fd.set("file", file);
  const res = await fetch("/api/store/upload", { method: "POST", body: fd });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
  if (!res.ok || !data?.ok || !data.url) throw new Error(data?.error ?? "No se pudo subir la imagen.");
  return data.url;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

type AspectKey = "square" | "video" | "wide" | "tall";
const ASPECT: Record<AspectKey, string> = {
  square: "aspect-square", video: "aspect-video", wide: "aspect-[16/6]", tall: "aspect-[4/5]",
};

export function ImageUpload({
  siteId, name, defaultValue = "", folder = "uploads", label = "Imagen", aspect = "video", hint, onChange,
}: {
  siteId: string;
  name: string;
  defaultValue?: string;
  folder?: string;
  label?: string;
  aspect?: AspectKey;
  hint?: string;
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function set(next: string) {
    setUrl(next);
    onChange?.(next);
  }

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      set(await uploadOne(siteId, folder, file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label ? <label className="label">{label}</label> : null}
      {hint ? <p className="hint">{hint}</p> : null}
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className={`relative w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 ${ASPECT[aspect]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button" onClick={() => set("")} aria-label="Quitar imagen"
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/95 text-neutral-800 shadow hover:bg-white"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 bg-white text-sm text-neutral-500 transition hover:bg-neutral-50 disabled:opacity-50 ${ASPECT[aspect]}`}
        >
          {uploading ? "Subiendo…" : (
            <>
              <span className="font-medium text-neutral-700">Haz clic para subir una imagen</span>
              <span className="text-xs">JPG, PNG, WEBP, GIF o SVG · máx. 8 MB</span>
            </>
          )}
        </button>
      )}

      {url ? (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-secondary">
          {uploading ? "Subiendo…" : "Reemplazar imagen"}
        </button>
      ) : null}

      <input
        ref={inputRef} type="file" accept={ACCEPT} hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

/**
 * Varias imágenes (fotos de un producto). Guarda un JSON de URLs en el input
 * oculto; la primera es la principal y se pueden reordenar con las flechas.
 */
export function MultiImageUpload({
  siteId, name, defaultValue = [], folder = "products", label = "Imágenes", max = 8, hint,
}: {
  siteId: string;
  name: string;
  defaultValue?: string[];
  folder?: string;
  label?: string;
  max?: number;
  hint?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      const room = Math.max(0, max - urls.length);
      const list = Array.from(files).slice(0, room);
      const next: string[] = [];
      for (const file of list) next.push(await uploadOne(siteId, folder, file));
      setUrls((prev) => [...prev, ...next].slice(0, max));
      if (files.length > room) setError(`Solo caben ${max} imágenes; se subieron las primeras ${room}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    setUrls((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  }

  return (
    <div className="space-y-2">
      {label ? <label className="label">{label}</label> : null}
      {hint ? <p className="hint">{hint}</p> : null}
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {urls.map((u, idx) => (
          <div key={`${u}-${idx}`} className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Mover antes"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs shadow disabled:opacity-30">←</button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === urls.length - 1} aria-label="Mover después"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-xs shadow disabled:opacity-30">→</button>
              </div>
              <button type="button" onClick={() => setUrls((p) => p.filter((_, i) => i !== idx))} aria-label="Quitar"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-sm shadow">×</button>
            </div>
            {idx === 0 ? (
              <span className="absolute bottom-1 left-1 rounded bg-purple px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Principal</span>
            ) : null}
          </div>
        ))}

        {urls.length < max ? (
          <button
            type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 bg-white text-xs text-neutral-500 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <span className="text-xl leading-none">+</span>
            <span>{uploading ? "Subiendo…" : "Agregar"}</span>
          </button>
        ) : null}
      </div>

      {urls.length === 0 ? (
        <p className="hint">Sube hasta {max} imágenes. La primera es la que se ve en el listado.</p>
      ) : null}

      <input
        ref={inputRef} type="file" accept={ACCEPT} multiple hidden
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
