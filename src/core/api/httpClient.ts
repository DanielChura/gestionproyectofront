import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import type {
  AuthSessionPayload,
  SessionUser,
} from "../interfaces/auth.interface";

declare module "axios" {
  export interface AxiosRequestConfig {
    gmPublic?: boolean;
    gmEpoch?: number;
    gmRetried?: boolean;
    gmAccess?: string | null;
  }
}

const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL;
const READ_METHODS = ["get", "head", "options"];

let accessToken: string | null = null;
let renewal: Promise<SessionUser> | null = null;
let csrfToken = "";
let sessionEpoch = 0;
let principal = "";
let currentUser: SessionUser | null = null;
const userListeners = new Set<(user: SessionUser | null) => void>();
const pendingReads = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  status?: number;
  payload?: Record<string, unknown>;
}

export function errorText(failure: unknown): string {
  return failure instanceof Error
    ? failure.message
    : "No se pudo completar la solicitud";
}

function isRead(method?: string): boolean {
  return READ_METHODS.includes(method ?? "get");
}

function normalizeError(failure: unknown): unknown {
  if (
    failure instanceof ApiError ||
    !axios.isAxiosError(failure) ||
    axios.isCancel(failure)
  )
    return failure;
  const body = failure.response?.data;
  const payload =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : undefined;
  const detail =
    payload?.detail ??
    payload?.message ??
    payload?.error ??
    (payload
      ? Object.values(payload).find((value) => typeof value === "string")
      : undefined) ??
    failure.message ??
    "No se pudo completar la solicitud";
  const error = new ApiError(
    Array.isArray(detail) ? detail.map(String).join(" ") : String(detail),
  );
  error.status = failure.response?.status;
  error.payload = payload;
  return error;
}

function csrfCookie(): string {
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export function sessionKey(user: SessionUser): string {
  return JSON.stringify([
    user.id,
    user.role,
    user.all_areas,
    user.areas.map((area) => area.id).sort((a, b) => a - b),
    user.permissions,
  ]);
}
export function sessionVersion(): number {
  return sessionEpoch;
}
export function checkSession(epoch: number): void {
  if (epoch !== sessionEpoch)
    throw new Error("La sesión cambió. Vuelve a cargar la información.");
}
export function getSessionUser(): SessionUser | null {
  return currentUser;
}
export function subscribeSession(
  listener: (user: SessionUser | null) => void,
): () => void {
  userListeners.add(listener);
  return () => {
    userListeners.delete(listener);
  };
}

function publishUser(user: SessionUser | null): void {
  currentUser = user;
  userListeners.forEach((listener) => listener(user));
}

function sharedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pendingReads.get(key);
  if (existing) return existing as Promise<T>;
  const operation = load().finally(() => pendingReads.delete(key));
  pendingReads.set(key, operation);
  return operation;
}

async function prepareCsrf(): Promise<void> {
  try {
    const { data } = await httpClient.get<{ csrf_token: string }>(
      "auth/csrf/",
      { gmPublic: true },
    );
    csrfToken = data.csrf_token;
  } catch (failure) {
    throw normalizeError(failure);
  }
}

export function startSession(
  access: string | null,
  user: SessionUser,
): SessionUser {
  const nextPrincipal = sessionKey(user);
  if (principal && principal !== nextPrincipal) {
    sessionEpoch += 1;
    pendingReads.clear();
  }
  principal = nextPrincipal;
  accessToken = access;
  publishUser(user);
  return user;
}

export function clearAccess(): void {
  accessToken = null;
  principal = "";
  sessionEpoch += 1;
  pendingReads.clear();
  renewal = null;
  publishUser(null);
}

function expireSession(epoch: number): void {
  if (epoch === sessionEpoch) clearAccess();
}

function postRefresh(): Promise<AuthSessionPayload> {
  return httpClient
    .post<AuthSessionPayload>("auth/refresh/", undefined, { gmPublic: true })
    .then((response) => response.data);
}

export function refreshSession(): Promise<SessionUser> {
  if (renewal) return renewal;
  const epoch = sessionEpoch;
  const operation = (async () => {
    try {
      let payload: AuthSessionPayload;
      try {
        payload = await postRefresh();
      } catch (failure) {
        // El token CSRF pudo caducar: se renueva y se reintenta una vez.
        if (!(failure instanceof ApiError) || failure.status !== 403)
          throw failure;
        csrfToken = "";
        await prepareCsrf();
        checkSession(epoch);
        payload = await postRefresh();
      }
      checkSession(epoch);
      return startSession(payload.access ?? null, payload.user);
    } catch (failure) {
      throw normalizeError(failure);
    }
  })().finally(() => {
    if (renewal === operation) renewal = null;
  });
  renewal = operation;
  return operation;
}

async function renew(epoch: number): Promise<void> {
  try {
    await refreshSession();
    checkSession(epoch);
  } catch (failure) {
    expireSession(epoch);
    throw normalizeError(failure);
  }
}

export const httpClient = axios.create({
  baseURL: `${apiBase}/api/`,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

httpClient.interceptors.request.use(async (config) => {
  if (config.gmPublic) {
    if (!isRead(config.method)) {
      if (!csrfCookie()) await prepareCsrf();
      config.headers.set("X-CSRFToken", csrfCookie());
    }
    return config;
  }

  const epoch = config.gmEpoch ?? sessionEpoch;
  config.gmEpoch = epoch;
  checkSession(epoch);
  if (!accessToken) await renew(epoch);
  checkSession(epoch);

  const token = accessToken;
  if (!token) {
    expireSession(epoch);
    throw new ApiError("No se pudo obtener un token de sesión válido.");
  }
  config.gmAccess = token;
  config.headers.set("Authorization", `Bearer ${token}`);
  if (!isRead(config.method) && csrfCookie())
    config.headers.set("X-CSRFToken", csrfCookie());
  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    const { config } = response;
    if (config.gmPublic) return response;
    checkSession(config.gmEpoch!);
    if (!isRead(config.method)) pendingReads.clear();
    return response;
  },
  async (failure: unknown) => {
    if (!axios.isAxiosError(failure) || !failure.config)
      throw normalizeError(failure);
    const config = failure.config;
    if (config.gmPublic || config.gmEpoch === undefined)
      throw normalizeError(failure);

    const epoch = config.gmEpoch;
    checkSession(epoch);
    if (failure.response?.status === 401) {
      if (config.gmRetried) expireSession(epoch);
      else {
        config.gmRetried = true;
        if (!accessToken || accessToken === config.gmAccess) await renew(epoch);
        checkSession(epoch);
        return httpClient.request(config);
      }
    }
    throw normalizeError(failure);
  },
);

const axiosGet = httpClient.get.bind(httpClient);
httpClient.get = ((url: string, config?: AxiosRequestConfig) => {
  const scoped = { ...config, gmEpoch: sessionEpoch };
  if (config?.signal) return axiosGet(url, scoped);
  const key = JSON.stringify([sessionEpoch, url, config?.params ?? null]);
  return sharedRead(key, () => axiosGet(url, scoped));
}) as typeof httpClient.get;
