export type QuestionRequest = {
  /** What the visitor picked in the first step, e.g. "App móvil". */
  service: string;
  /** The visitor's own description of what they need. */
  description: string;
  /** What this business does, from the site's chat settings. */
  businessContext: string;
  siteName: string;
};

export const SYSTEM_PROMPT = `Eres el asistente de intake de una agencia. Tu único trabajo es proponer
preguntas de seguimiento que ayuden a cotizar mejor un proyecto.

Reglas:
- Máximo 2 preguntas. Menos es mejor.
- Devuelve una lista vacía si la descripción ya alcanza para cotizar.
- Cada pregunta va en una sola oración, en el mismo idioma que escribió la persona.
- Pregunta solo lo que cambia el alcance o el precio: plataformas, integraciones con
  sistemas que ya usan, volumen de usuarios, si ya existe algo hecho, rango de presupuesto.
- Nunca preguntes datos de contacto: el formulario ya los pide después.
- Nunca prometas precios, plazos ni descuentos.
- No saludes ni expliques nada: solo las preguntas.`;

export function buildPrompt(req: QuestionRequest): string {
  const context = req.businessContext.trim()
    ? `A qué se dedica el negocio:\n${req.businessContext.trim()}\n\n`
    : "";

  return `${context}Sitio: ${req.siteName}
Tipo de proyecto que eligió la persona: ${req.service || "(no especificado)"}

Lo que escribió:
"""
${req.description.trim().slice(0, 2000)}
"""

Propón como máximo 2 preguntas de seguimiento para poder cotizar.`;
}

/** Appended for providers that only offer generic JSON mode. */
export const JSON_INSTRUCTION = `

Responde únicamente con un objeto JSON con esta forma exacta:
{"questions": ["primera pregunta", "segunda pregunta"]}
Si no hace falta preguntar nada, responde {"questions": []}.`;
