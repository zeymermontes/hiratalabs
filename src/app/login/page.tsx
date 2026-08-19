import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  link_invalid:
    "Ese enlace ya se usó o expiró. Los enlaces sirven una sola vez — pide uno nuevo.",
  missing_code:
    "El enlace llegó incompleto. Pide uno nuevo y ábrelo directo desde el correo.",
  exchange_failed:
    "No se pudo validar el enlace. Ábrelo en el mismo navegador donde lo pediste: la sesión se inicia ahí.",
  not_allowed: "Ese correo no tiene acceso al panel.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <LoginForm initialError={error ? MESSAGES[error] ?? null : null} />;
}
