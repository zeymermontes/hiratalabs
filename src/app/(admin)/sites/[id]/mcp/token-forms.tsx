"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/ui";
import { createMcpToken, revokeMcpToken, type CreateTokenState } from "@/modules/mcp/actions";

function CopyBox({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label ? <div className="label">{label}</div> : null}
      <div className="flex items-start gap-2">
        <pre className="input min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed">{value}</pre>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* el navegador no dejó copiar: el texto sigue seleccionable */
            }
          }}
          className="btn-secondary shrink-0 px-3 py-2 text-xs"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function snippets(url: string, token: string, name: string) {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tienda";
  const server = `hirata-${key}`;
  const claudeDesktop = JSON.stringify({
    mcpServers: {
      [server]: {
        command: "npx",
        args: ["-y", "mcp-remote", url, "--header", `Authorization: Bearer ${token}`],
      },
    },
  }, null, 2);
  const cursor = JSON.stringify({
    mcpServers: {
      [server]: { url, headers: { Authorization: `Bearer ${token}` } },
    },
  }, null, 2);
  return { server, claudeDesktop, cursor };
}

export function CreateTokenForm({ siteId, mcpUrl }: { siteId: string; mcpUrl: string }) {
  const [state, action, pending] = useActionState<CreateTokenState, FormData>(createMcpToken, {});

  if (state.ok && state.rawToken) {
    const s = snippets(mcpUrl, state.rawToken, state.name ?? "tienda");
    return (
      <div className="card space-y-5 border-purple/40 bg-purple-tint/30 p-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Token creado: {state.name}</h3>
          <p className="mt-1 text-sm text-amber-800">
            Cópialo ahora. Por seguridad <strong>no se vuelve a mostrar</strong>: solo guardamos una huella para
            reconocerlo. Si lo pierdes, revócalo y crea otro.
          </p>
        </div>
        <CopyBox label="Token" value={state.rawToken} />
        <CopyBox label="URL del servidor MCP" value={mcpUrl} />

        <div className="space-y-4 border-t border-purple/20 pt-4">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-900">Claude Desktop</p>
            <p className="hint mb-2">
              Ajustes › Desarrollador › Editar configuración, en <code>claude_desktop_config.json</code>. Necesita Node.js
              instalado (usa <code>mcp-remote</code>). Reinicia Claude Desktop después de guardar.
            </p>
            <CopyBox value={s.claudeDesktop} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-900">Cursor</p>
            <p className="hint mb-2">En <code>.cursor/mcp.json</code> del proyecto, o en Ajustes › MCP.</p>
            <CopyBox value={s.cursor} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-900">Cualquier otro cliente (ChatGPT, Claude.ai, etc.)</p>
            <p className="hint">
              Donde te pida un "servidor MCP remoto" o "conector", pon la URL de arriba y, como encabezado
              <code> Authorization</code>, el valor <code>Bearer {"<token>"}</code>. Transporte: Streamable HTTP, sin OAuth.
            </p>
          </div>
        </div>
        <a href={`/sites/${siteId}/mcp`} className="btn-secondary inline-block">Listo, ya lo guardé</a>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="siteId" value={siteId} />
      <h3 className="text-sm font-semibold text-neutral-900">Nuevo token</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" hint="Para qué o para quién es. Te ayuda a saber cuál revocar.">
          <input name="name" required maxLength={60} placeholder="Claude Desktop de Ana" className="input" />
        </Field>
        <div>
          <span className="label">Permisos</span>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" name="scopes" value="read" defaultChecked disabled className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
              <input type="hidden" name="scopes" value="read" />
              <span>
                <span className="text-neutral-900">Lectura</span>
                <span className="hint block">Productos, pedidos, ventas y mensajes. Siempre incluido.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="checkbox" name="scopes" value="write" className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
              <span>
                <span className="text-neutral-900">Escritura</span>
                <span className="hint block">Crear y editar productos, cambiar el estado de pedidos, marcar mensajes leídos.</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creando…" : "Crear token"}
        </button>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function RevokeButton({ siteId, tokenId, name }: { siteId: string; tokenId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Revocar el token "${name}"? La IA que lo use dejará de funcionar de inmediato.`)) {
          start(() => { void revokeMcpToken(siteId, tokenId); });
        }
      }}
      className="text-xs text-neutral-400 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Revocando…" : "Revocar"}
    </button>
  );
}
