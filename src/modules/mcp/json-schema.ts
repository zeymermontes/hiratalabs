import { z } from "zod";

/**
 * Convierte el subconjunto de zod que usan las herramientas MCP a JSON Schema,
 * para que tools/list y la validación real salgan de la misma definición.
 */
export type JsonSchema = Record<string, unknown>;

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const description = schema.description;
  const withDesc = (s: JsonSchema) => (description ? { ...s, description } : s);

  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return withDesc(zodToJsonSchema(schema.unwrap()));
  }
  if (schema instanceof z.ZodDefault) {
    return withDesc({ ...zodToJsonSchema(schema.removeDefault()), default: schema._def.defaultValue() });
  }
  if (schema instanceof z.ZodEffects) {
    return withDesc(zodToJsonSchema(schema.innerType()));
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!value.isOptional()) required.push(key);
    }
    const out: JsonSchema = { type: "object", properties, additionalProperties: false };
    if (required.length) out.required = required;
    return withDesc(out);
  }
  if (schema instanceof z.ZodArray) {
    const out: JsonSchema = { type: "array", items: zodToJsonSchema(schema.element) };
    if (schema._def.minLength) out.minItems = schema._def.minLength.value;
    if (schema._def.maxLength) out.maxItems = schema._def.maxLength.value;
    return withDesc(out);
  }
  if (schema instanceof z.ZodEnum) {
    return withDesc({ type: "string", enum: [...(schema.options as string[])] });
  }
  if (schema instanceof z.ZodString) {
    const out: JsonSchema = { type: "string" };
    for (const check of schema._def.checks) {
      if (check.kind === "min") out.minLength = check.value;
      if (check.kind === "max") out.maxLength = check.value;
      if (check.kind === "uuid") out.format = "uuid";
    }
    return withDesc(out);
  }
  if (schema instanceof z.ZodNumber) {
    const out: JsonSchema = { type: schema.isInt ? "integer" : "number" };
    for (const check of schema._def.checks) {
      if (check.kind === "min") out.minimum = check.value;
      if (check.kind === "max") out.maximum = check.value;
    }
    return withDesc(out);
  }
  if (schema instanceof z.ZodBoolean) return withDesc({ type: "boolean" });
  if (schema instanceof z.ZodUnion) {
    const options = schema.options as z.ZodTypeAny[];
    return withDesc({ anyOf: options.map((o) => zodToJsonSchema(o)) });
  }
  return withDesc({});
}
