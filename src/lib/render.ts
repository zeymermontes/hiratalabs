import { env } from "@/lib/env";

const BASE = "https://api.render.com/v1";

export type RenderDomain = {
  id: string;
  name: string;
  domainType?: string;
  verificationStatus?: string;
  createdAt?: string;
};

function configured() {
  return Boolean(env.renderApiKey && env.renderServiceId);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.renderApiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Render API ${res.status}: ${body.slice(0, 300) || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const renderConfigured = configured;

/** Registers the hostname on the Render service so it can issue a certificate. */
export async function createCustomDomain(hostname: string): Promise<RenderDomain | null> {
  if (!configured()) return null;
  const out = await call<RenderDomain | RenderDomain[]>(
    `/services/${env.renderServiceId}/custom-domains`,
    { method: "POST", body: JSON.stringify({ name: hostname }) },
  );
  return Array.isArray(out) ? out[0] ?? null : out;
}

export async function getCustomDomain(idOrName: string): Promise<RenderDomain | null> {
  if (!configured()) return null;
  try {
    return await call<RenderDomain>(`/services/${env.renderServiceId}/custom-domains/${idOrName}`);
  } catch {
    return null;
  }
}

export async function deleteCustomDomain(idOrName: string): Promise<void> {
  if (!configured()) return;
  try {
    await call(`/services/${env.renderServiceId}/custom-domains/${idOrName}`, { method: "DELETE" });
  } catch {
    // Already gone on Render's side — nothing to undo locally.
  }
}

/**
 * Sufijos de dos etiquetas: ahí el dominio raíz tiene tres partes.
 * Sin esta lista, `cliente.com.mx` se toma por subdominio y las instrucciones
 * piden un CNAME llamado "cliente", que en realidad crea
 * cliente.cliente.com.mx y nunca resuelve.
 */
const SUFIJOS_COMPUESTOS = new Set([
  "com.mx", "org.mx", "net.mx", "gob.mx", "edu.mx",
  "com.ar", "com.br", "com.co", "com.pe", "com.cl", "com.ve", "com.ec",
  "com.uy", "com.py", "com.bo", "com.gt", "com.sv", "com.hn", "com.ni",
  "com.pa", "com.do", "com.pr", "com.cr",
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "co.nz", "co.za",
  "com.tr", "com.ua", "co.jp", "com.cn", "com.tw", "com.hk", "com.sg",
  "com.my", "com.ph", "com.vn", "co.in", "com.pk", "com.ng", "com.sa",
]);

/** El dominio registrable: lo que el cliente compró, sin subdominios. */
export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const ultimos2 = parts.slice(-2).join(".");
  return parts.slice(SUFIJOS_COMPUESTOS.has(ultimos2) ? -3 : -2).join(".");
}

export type DnsRecord = { type: string; name: string; value: string; label?: string };

/** DNS instructions we show the client for their own domain. */
export function dnsInstructions(hostname: string, serviceHost: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const raiz = registrableDomain(host);

  if (host === raiz) {
    return {
      // Dos caminos porque un registro A no acepta un hostname como valor:
      // quien no tenga ALIAS necesita la IP, no el host de Render.
      alternativas: true,
      records: [
        { type: "ALIAS / ANAME", name: "@", value: serviceHost, label: "si el proveedor lo soporta" },
        { type: "A", name: "@", value: env.renderApexIp, label: "si no soporta ALIAS" },
      ] as DnsRecord[],
      note: `Crea solo uno de los dos, no ambos. Si el DNS está en Cloudflare, usa CNAME a ${serviceHost} incluso en el ápex: Cloudflare lo aplana y rechaza el registro A. Si el panel de Render muestra otra IP para este dominio, esa manda. Para que también responda en www.${raiz}, agrégalo aquí como dominio aparte.`,
    };
  }

  return {
    alternativas: false,
    records: [
      { type: "CNAME", name: host.slice(0, host.length - raiz.length - 1), value: serviceHost },
    ] as DnsRecord[],
    note: "Apunta el subdominio al host de Render. El certificado TLS se emite solo en cuanto el DNS propaga.",
  };
}
