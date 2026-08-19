"use client";

import { useActionState, useRef, useState } from "react";
import { uploadVersion, type ActionState } from "../../actions";

export function UploadForm({ siteId, hasVersion }: { siteId: string; hasVersion: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadVersion, {});
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <form action={action} className="card p-5">
      <input type="hidden" name="siteId" value={siteId} />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(f);
            inputRef.current.files = dt.files;
            setFileName(f.name);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400"
        }`}
      >
        <p className="text-sm font-medium text-neutral-800">
          {fileName || "Arrastra el .zip de la landing aquí"}
        </p>
        <p className="hint mt-1">
          El <code className="rounded bg-neutral-100 px-1">index.html</code> debe estar en la raíz del ZIP.
        </p>
        <input
          ref={inputRef} type="file" name="zip" accept=".zip,application/zip"
          className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="label">Etiqueta (opcional)</label>
          <input name="label" placeholder="v2 — nuevo hero" className="input" />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-neutral-700">
          <input type="checkbox" name="publish" defaultChecked className="h-4 w-4 rounded border-neutral-300" />
          Publicar al subir
        </label>
        <button type="submit" disabled={pending || !fileName} className="btn-primary mb-0.5">
          {pending ? "Subiendo…" : hasVersion ? "Subir nueva versión" : "Subir y publicar"}
        </button>
      </div>

      {state.error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
