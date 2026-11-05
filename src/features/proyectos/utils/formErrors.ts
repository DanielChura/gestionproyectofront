import { ApiError } from "../../auth/api";

export type FieldErrors = Record<string, string>;

function messages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(messages);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(messages);
  }
  return [];
}

export function apiFieldErrors(
  failure: unknown,
  fields: Record<string, string>,
): FieldErrors {
  if (!(failure instanceof ApiError) || !failure.payload) return {};
  const result: FieldErrors = {};
  for (const [key, id] of Object.entries(fields)) {
    const text = messages(failure.payload[key]).join(" ");
    if (text) {
      result[id] = result[id] ? `${result[id]} ${text}` : text;
    }
  }
  return result;
}
