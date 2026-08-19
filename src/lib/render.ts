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

/** DNS instructions we show the client for their own domain. */
export function dnsInstructions(hostname: string, serviceHost: string) {
  const isApex = hostname.split(".").length === 2;
  return isApex
    ? {
        type: "A / ALIAS",
        name: "@",
        value: serviceHost,
        note: "Si tu proveedor soporta ALIAS/ANAME al host de Render, úsalo. Si no, usa los registros A que muestra Render.",
      }
    : {
        type: "CNAME",
        name: hostname.split(".")[0],
        value: serviceHost,
        note: "Apunta el subdominio al host de Render. El certificado TLS se emite solo en cuanto el DNS propaga.",
      };
}
