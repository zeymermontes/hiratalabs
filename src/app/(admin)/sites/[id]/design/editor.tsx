"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PageKey, ThemeDoc } from "@/themes/types";
import { applyTemplateAction, discardAction, publishAction, restoreVersionAction, saveDraftAction, type EditorResult } from "./actions";
import { PAGE_PATHS, type CategoryOption, type TemplateSummary, type VersionRow } from "./editor-types";
import { Icon, type IconName } from "./icons";
import { SectionsPanel, type Selection, type Update } from "./sections-panel";
import { ConfirmDialog, TemplatesPanel } from "./templates-panel";
import { ThemePanel } from "./theme-panel";
import { VersionsPanel } from "./versions-panel";

type Tab = "sections" | "theme" | "templates" | "versions";
type Device = "desktop" | "tablet" | "phone";
type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
type Hist = { past: ThemeDoc[]; present: ThemeDoc; future: ThemeDoc[]; key?: string; at: number };

const TABS: { key: Tab; label: string }[] = [
  { key: "sections", label: "Secciones" }, { key: "theme", label: "Tema" },
  { key: "templates", label: "Plantillas" }, { key: "versions", label: "Versiones" },
];
const DEVICES: { key: Device; label: string; icon: IconName; width: string }[] = [
  { key: "desktop", label: "Escritorio", icon: "desktop", width: "100%" },
  { key: "tablet", label: "Tableta", icon: "tablet", width: "820px" },
  { key: "phone", label: "Celular", icon: "phone", width: "390px" },
];

const SAVE_DELAY = 700;
const HISTORY_MAX = 100;
// Cambios seguidos al mismo campo (escribir, arrastrar un color) cuentan como uno para Deshacer.
const COALESCE_MS = 1200;

function pageFromPath(path: string): PageKey | null {
  if (path === "/" || path === "") return "home";
  if (/^\/productos\/[^/]+/.test(path)) return "product";
  if (path.startsWith("/productos") || path.startsWith("/categorias")) return "collection";
  return null;
}

const failed = (msg: string): EditorResult => ({ ok: false, error: msg });

export function ThemeEditor({
  siteId, initialDoc, initialDirty, templates, categories, productSlug, previewBase, previewToken, versions,
}: {
  siteId: string;
  initialDoc: ThemeDoc;
  initialDirty: boolean;
  templates: TemplateSummary[];
  categories: CategoryOption[];
  productSlug: string | null;
  previewBase: string;
  previewToken: string;
  versions: VersionRow[];
}) {
  const [hist, setHist] = useState<Hist>({ past: [], present: initialDoc, future: [], at: 0 });
  const doc = hist.present;
  const [tab, setTab] = useState<Tab>("sections");
  const [device, setDevice] = useState<Device>("desktop");
  const [page, setPage] = useState<PageKey>("home");
  const [selected, setSelected] = useState<Selection>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState(initialDirty);
  const [busy, setBusy] = useState<null | "publish" | "discard" | "template" | "restore">(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [ready, setReady] = useState(false);

  const pathFor = useCallback((p: PageKey) => (p === "product" ? (productSlug ? `/productos/${productSlug}` : "/productos") : p === "collection" ? "/productos" : "/"), [productSlug]);
  const [iframeSrc, setIframeSrc] = useState(() => `${previewBase}/?__preview=${encodeURIComponent(previewToken)}`);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewOrigin = useMemo(() => { try { return new URL(previewBase).origin; } catch { return "*"; } }, [previewBase]);
  const post = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(msg, previewOrigin);
  }, [previewOrigin]);

  /* ------------------------------------------------- historial */

  const update: Update = useCallback((fn, coalesceKey) => {
    setHist((h) => {
      const next = fn(h.present);
      if (next === h.present) return h;
      const now = Date.now();
      const merge = coalesceKey !== undefined && h.key === coalesceKey && now - h.at < COALESCE_MS;
      return { past: merge ? h.past : [...h.past, h.present].slice(-HISTORY_MAX), present: next, future: [], key: coalesceKey, at: now };
    });
  }, []);
  const undo = useCallback(() => setHist((h) => h.past.length
    ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], at: 0 }
    : h), []);
  const redo = useCallback(() => setHist((h) => h.future.length
    ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), at: 0 }
    : h), []);

  /* ------------------------------------------------- autoguardado */

  const docRef = useRef(doc);
  const lastSaved = useRef<ThemeDoc>(initialDoc);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    while (inFlight.current) await inFlight.current;
    const snapshot = docRef.current;
    if (snapshot === lastSaved.current) return true;
    const run = (async () => {
      setStatus("saving");
      const res = await saveDraftAction(siteId, snapshot).catch(() => failed("Sin conexión. Tus cambios no se guardaron."));
      if (!res.ok) {
        setStatus("error");
        setMessage({ kind: "error", text: res.error });
        return false;
      }
      lastSaved.current = snapshot;
      setDirty(true);
      setStatus(docRef.current === snapshot ? "saved" : "pending");
      post({ type: "sf:reload" });
      return true;
    })();
    inFlight.current = run;
    try { return await run; } finally { if (inFlight.current === run) inFlight.current = null; }
  }, [siteId, post]);

  useEffect(() => {
    docRef.current = doc;
    if (doc === lastSaved.current) {
      // Deshacer regresó a lo que ya está guardado: no hay nada que mandar.
      if (timer.current) { clearTimeout(timer.current); timer.current = null; setStatus("saved"); }
      return;
    }
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void saveNow(); }, SAVE_DELAY);
  }, [doc, saveNow]);

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (status !== "pending" && status !== "saving" && status !== "error") return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [status]);

  /** Documento que ya está guardado en el servidor (plantilla, versión, descartar). */
  const setServerDoc = useCallback((next: ThemeDoc) => {
    lastSaved.current = next;
    setHist((h) => ({ past: [...h.past, h.present].slice(-HISTORY_MAX), present: next, future: [], at: 0 }));
    setStatus("saved");
    setSelected(null);
    post({ type: "sf:reload" });
  }, [post]);

  /* ------------------------------------------------- vista previa */

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (previewOrigin !== "*" && e.origin !== previewOrigin) return;
      const data = e.data as { type?: string; path?: string } | null;
      if (data?.type !== "sf:ready") return;
      setReady(true);
      const p = typeof data.path === "string" ? pageFromPath(data.path) : null;
      if (p) setPage(p);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewOrigin]);

  function goTo(p: PageKey) {
    setPage(p);
    if (selected && selected.zone !== "header" && selected.zone !== "footer" && selected.zone !== p) setSelected(null);
    const path = pathFor(p);
    if (ready) post({ type: "sf:navigate", path });
    else setIframeSrc(`${previewBase}${path}?__preview=${encodeURIComponent(previewToken)}`);
  }

  useEffect(() => {
    if (selected) post({ type: "sf:focus", id: selected.id });
  }, [selected, post]);

  /* ------------------------------------------------- atajos */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      // En campos de texto se respeta el deshacer del propio campo.
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["checkbox", "radio", "range", "color", "button"].includes((t as HTMLInputElement).type)))) return;
      e.preventDefault();
      if (k === "y" || e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  /* ------------------------------------------------- acciones */

  async function publish() {
    setBusy("publish");
    setMessage(null);
    if (await saveNow()) {
      const res = await publishAction(siteId).catch(() => failed("Sin conexión. No se publicó."));
      if (res.ok) {
        setDirty(false);
        setMessage({ kind: "ok", text: "¡Listo! Tus cambios ya se ven en tu tienda." });
      } else setMessage({ kind: "error", text: res.error });
    }
    setBusy(null);
  }

  async function discard() {
    setBusy("discard");
    setMessage(null);
    if (timer.current) clearTimeout(timer.current);
    while (inFlight.current) await inFlight.current;
    const res = await discardAction(siteId).catch(() => failed("Sin conexión."));
    if (res.ok) {
      setServerDoc(res.doc);
      setDirty(false);
      setStatus("idle");
      setMessage({ kind: "ok", text: "Volviste a lo que está publicado." });
    } else setMessage({ kind: "error", text: res.error });
    setConfirmDiscard(false);
    setBusy(null);
  }

  async function applyTemplate(key: string, style?: string): Promise<boolean> {
    setBusy("template");
    setMessage(null);
    if (!(await saveNow())) { setBusy(null); return false; }
    const res = await applyTemplateAction(siteId, key, style).catch(() => failed("Sin conexión."));
    setBusy(null);
    if (!res.ok) { setMessage({ kind: "error", text: res.error }); return false; }
    setServerDoc(res.doc);
    setDirty(true);
    setMessage({ kind: "ok", text: "Plantilla aplicada al borrador. Revísala y publica cuando te guste." });
    return true;
  }

  async function restore(id: string) {
    setBusy("restore");
    setMessage(null);
    if (await saveNow()) {
      const res = await restoreVersionAction(siteId, id).catch(() => failed("Sin conexión."));
      if (res.ok) {
        setServerDoc(res.doc);
        setDirty(true);
        setMessage({ kind: "ok", text: "Versión copiada a tu borrador. Publica para que se vea en la tienda." });
      } else setMessage({ kind: "error", text: res.error });
    }
    setBusy(null);
  }

  /* ------------------------------------------------- vista */

  const template = templates.find((t) => t.key === doc.template);
  const styleName = template?.styles.find((s) => s.key === doc.style)?.name;
  const width = DEVICES.find((d) => d.key === device)!.width;
  const pageSelectId = useId();
  const tabIds = useId();
  const unsaved = status === "pending" || status === "saving";

  const statusText = status === "saving" || status === "pending" ? "Guardando…"
    : status === "error" ? "No se guardó"
    : status === "saved" ? "Guardado" : dirty ? "Borrador guardado" : "Al día con tu tienda";

  return (
    <div className="space-y-3">
      {/* Barra superior */}
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {template?.name ?? doc.template}{styleName ? <span className="font-normal text-neutral-500"> · {styleName}</span> : null}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500" aria-live="polite">
            <span className={status === "error" ? "font-semibold text-red-700" : ""}>{statusText}</span>
            {status === "error" ? (
              <button type="button" onClick={() => void saveNow()} className="font-semibold text-purple underline-offset-2 hover:underline">Reintentar</button>
            ) : null}
            {dirty || unsaved ? <span className="pill bg-amber-50 text-amber-700">Cambios sin publicar</span> : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Tamaño de la vista previa" className="hidden rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 sm:flex">
            {DEVICES.map((d) => (
              <button
                key={d.key} type="button" role="radio" aria-checked={device === d.key} title={d.label} aria-label={d.label}
                onClick={() => setDevice(d.key)}
                className={`inline-flex h-8 w-9 items-center justify-center rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                  device === d.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Icon name={d.icon} />
              </button>
            ))}
          </div>
          <label htmlFor={pageSelectId} className="sr-only">Página que estás viendo</label>
          <select id={pageSelectId} value={page} onChange={(e) => goTo(e.target.value as PageKey)} className="input h-9 w-auto py-1">
            {PAGE_PATHS.map((p) => (
              <option key={p.key} value={p.key} disabled={p.key === "product" && !productSlug}>
                {p.label}{p.key === "product" && !productSlug ? " (sin productos)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex">
            <button type="button" onClick={undo} disabled={hist.past.length === 0} className="btn-secondary rounded-r-none px-2.5" aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
              <Icon name="undo" />
            </button>
            <button type="button" onClick={redo} disabled={hist.future.length === 0} className="btn-secondary -ml-px rounded-l-none px-2.5" aria-label="Rehacer" title="Rehacer (Ctrl+Shift+Z)">
              <Icon name="redo" />
            </button>
          </div>
          <button type="button" onClick={() => setConfirmDiscard(true)} disabled={!dirty || busy !== null} className="btn-secondary">
            Descartar cambios
          </button>
          <button type="button" onClick={() => void publish()} disabled={busy !== null || status === "error" || (!dirty && !unsaved)} className="btn-primary">
            {busy === "publish" ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>

      {message ? (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
            message.kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="shrink-0 text-xs font-semibold opacity-70 hover:opacity-100" aria-label="Cerrar aviso">✕</button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:h-[calc(100vh-12rem)] lg:min-h-[640px] lg:flex-row">
        {/* Panel */}
        <aside className="card order-2 flex min-h-0 flex-col lg:order-1 lg:w-[380px] lg:shrink-0">
          <div role="tablist" aria-label="Partes del editor" className="flex gap-1 border-b border-neutral-200 px-2 pt-2">
            {TABS.map((t) => (
              <button
                key={t.key} type="button" role="tab" id={`${tabIds}-${t.key}`} aria-selected={tab === t.key} aria-controls={`${tabIds}-${t.key}-panel`}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex-1 border-b-2 px-1 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple/40 ${
                  tab === t.key ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`${tabIds}-${tab}-panel`} aria-labelledby={`${tabIds}-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "sections" ? (
              <SectionsPanel
                doc={doc} page={page} update={update} selected={selected} onSelect={setSelected}
                siteId={siteId} categories={categories}
              />
            ) : tab === "theme" ? (
              <ThemePanel doc={doc} update={update} template={template} siteId={siteId} />
            ) : tab === "templates" ? (
              <TemplatesPanel templates={templates} current={doc.template} busy={busy !== null} onApply={applyTemplate} />
            ) : (
              <VersionsPanel versions={versions} templates={templates} busy={busy !== null} onRestore={(id) => void restore(id)} />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-4 py-2.5 text-xs">
            <Link href={`/sites/${siteId}/design/portada`} className="font-semibold text-purple hover:underline">Banners →</Link>
            <a href={previewBase} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-neutral-600 hover:text-neutral-900">
              Ver tienda <Icon name="external" className="h-3.5 w-3.5" />
            </a>
          </div>
        </aside>

        {/* Vista previa */}
        <div className="card order-1 flex h-[70vh] min-w-0 flex-1 flex-col overflow-hidden bg-neutral-100 lg:order-2 lg:h-auto">
          <div className="flex min-h-0 flex-1 justify-center overflow-auto lg:p-3">
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="Vista previa de tu tienda"
              className="h-full max-w-full rounded-none border-0 bg-white shadow-sm transition-[width] duration-300 ease-out lg:rounded-lg"
              style={{ width }}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="¿Descartar los cambios?"
        confirmLabel={busy === "discard" ? "Descartando…" : "Sí, descartar"}
        busy={busy === "discard"}
        danger
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => void discard()}
      >
        <p>Se borra tu borrador y el editor vuelve a mostrar lo que está publicado en tu tienda.</p>
        <p className="mt-2">Si te arrepientes, puedes usar <strong>Deshacer</strong> enseguida.</p>
      </ConfirmDialog>
    </div>
  );
}
