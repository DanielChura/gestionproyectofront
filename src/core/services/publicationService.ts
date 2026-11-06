import axios from "axios";
import { httpClient } from "../api/httpClient";
import type {
  Publication,
  PublicationCatalogs,
  PublicationCreateData,
  PublicationFilters,
  PublicationUpdateData,
} from "../interfaces/publication.interface";

export async function listPublications(
  filters: PublicationFilters = {},
): Promise<Publication[]> {
  const params = new URLSearchParams();
  const search = filters.search?.trim();
  if (filters.project_id) params.set("project_id", String(filters.project_id));
  if (filters.state) params.set("state", filters.state);
  if (search) params.set("search", search);
  const query = params.toString();
  const { data } = await httpClient.get<Publication[]>(
    query ? `publications/?${query}` : "publications/",
  );
  return data;
}

export async function getPublicationCatalogs(): Promise<PublicationCatalogs> {
  const { data } = await httpClient.get<PublicationCatalogs>(
    "publications/catalogs/",
  );
  return data;
}

export async function createPublication(
  payload: PublicationCreateData,
): Promise<Publication> {
  const { data } = await httpClient.post<Publication>("publications/", payload);
  return data;
}

export async function updatePublication(
  publicationId: number,
  payload: PublicationUpdateData,
): Promise<Publication> {
  const { data } = await httpClient.patch<Publication>(
    `publications/${publicationId}/`,
    payload,
  );
  return data;
}

export async function applyToPublication(
  publicationId: number,
): Promise<Publication> {
  const { data } = await httpClient.post<Publication>(
    `publications/${publicationId}/apply/`,
  );
  return data;
}

function payloadText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(payloadText).join(" ");
  if (payload && typeof payload === "object")
    return Object.values(payload).map(payloadText).join(" ");
  return "";
}

function errorPayload(failure: unknown): Record<string, unknown> | null {
  if (!axios.isAxiosError(failure)) return null;
  const data: unknown = failure.response?.data;
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : null;
}

export function publicationErrorText(failure: unknown): string {
  const payload = errorPayload(failure);
  if (payload) {
    const detail = payload.detail ?? Object.values(payload)[0];
    const text = payloadText(detail).trim();
    if (text) return text;
  }
  if (axios.isAxiosError(failure)) {
    return failure.response
      ? "No se pudo completar la solicitud"
      : "No se pudo conectar con el servicio de publicaciones";
  }
  return failure instanceof Error
    ? failure.message
    : "No se pudo completar la solicitud";
}

export function publicationFieldErrors(
  failure: unknown,
  fields: Record<string, string>,
): Record<string, string> {
  const payload = errorPayload(failure);
  if (!payload) return {};
  const result: Record<string, string> = {};
  for (const [key, id] of Object.entries(fields)) {
    const text = payloadText(payload[key]).trim();
    if (text) result[id] = result[id] ? `${result[id]} ${text}` : text;
  }
  return result;
}
