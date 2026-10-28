"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SfAlert } from "./checkout-ui";

/**
 * Payment Brick de Mercado Pago con el SDK vanilla (sdk.mercadopago.com/js/v2):
 * no hay paquete npm en este repo. El brick tokeniza la tarjeta en el navegador
 * y nosotros cobramos desde /api/store/payment/process con el token.
 */
type Props = {
  orderId: string;
  amount: number;
  publicKey: string;
  email: string;
  colors: { primary: string; primaryFg: string; fg: string; bg: string };
  /** Radio real ("8px"), no una variable CSS: el brick vive en iframes. */
  radius: string;
};

type MpWindow = Window & { MercadoPago?: new (key: string, opts?: Record<string, unknown>) => MpInstance };
type MpInstance = { bricks: () => { create: (kind: string, el: string, settings: Record<string, unknown>) => Promise<{ unmount: () => void }> } };

const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if ((window as MpWindow).MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { sdkPromise = null; reject(new Error("No se pudo cargar Mercado Pago.")); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export function MpBrick({ orderId, amount, publicKey, email, colors, radius }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerId = useRef(`mp-brick-${orderId.slice(0, 8)}`);

  useEffect(() => {
    let controller: { unmount: () => void } | null = null;
    let cancelled = false;

    loadSdk().then(async () => {
      if (cancelled) return;
      const MP = (window as MpWindow).MercadoPago;
      if (!MP) throw new Error("Mercado Pago no está disponible.");
      const mp = new MP(publicKey, { locale: "es-MX" });
      controller = await mp.bricks().create("payment", containerId.current, {
        initialization: { amount, payer: { email, entityType: "individual" } },
        customization: {
          paymentMethods: { creditCard: "all", debitCard: "all", ticket: "all", atm: "all", bankTransfer: "all", mercadoPago: "all" },
          visual: {
            style: {
              theme: "default",
              customVariables: {
                baseColor: colors.primary,
                baseColorFirstVariant: colors.primary,
                baseColorSecondVariant: colors.primary,
                outlinePrimaryColor: colors.primary,
                buttonTextColor: colors.primaryFg,
                textPrimaryColor: colors.fg,
                formBackgroundColor: colors.bg,
                inputBackgroundColor: colors.bg,
                formInputsTextColor: colors.fg,
                formLabelTextColor: colors.fg,
                borderRadiusLarge: radius,
                borderRadiusMedium: radius,
                borderRadiusSmall: radius,
                fontSizeMedium: "15px",
              },
            },
          },
        },
        callbacks: {
          onReady: () => setReady(true),
          onError: (err: { type?: string; cause?: string; message?: string }) => {
            if (err?.type === "non_critical") return;
            console.error("[mp brick]", err);
            if (err?.cause === "secure_fields_card_token_creation_failed") {
              setError("No se pudo validar la tarjeta. Si usas un bloqueador de anuncios, desactívalo o prueba en una ventana de incógnito.");
              return;
            }
            setError(err?.message ?? "Hubo un problema con el formulario de pago. Recarga la página.");
          },
          onSubmit: async ({ formData }: { formData: Record<string, unknown> }) => {
            setError(null);
            const res = await fetch("/api/store/payment/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...formData, order_id: orderId }),
            });
            const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; status?: string; paymentId?: string; message?: string };
            if (!res.ok || !data.ok) {
              const msg = data.error ?? "No se pudo procesar el pago.";
              setError(msg);
              throw new Error(msg);
            }
            if (data.status === "rejected") {
              // El brick permite corregir y reintentar sin recargar.
              setError(data.message ?? "El pago no fue aprobado. Intenta con otra tarjeta.");
              throw new Error(data.message ?? "rejected");
            }
            router.push(`/checkout/success?o=${orderId}&p=${encodeURIComponent(data.paymentId ?? "")}`);
          },
        },
      });
    }).catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar el formulario de pago.");
    });

    return () => {
      cancelled = true;
      controller?.unmount();
    };
    // Se monta una sola vez por pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, publicKey]);

  return (
    <div>
      {!ready && !error ? <p className="sf-muted" style={{ fontSize: 14 }}>Cargando formulario de pago…</p> : null}
      <div id={containerId.current} />
      {error ? <div style={{ marginTop: 12 }}><SfAlert>{error}</SfAlert></div> : null}
    </div>
  );
}
