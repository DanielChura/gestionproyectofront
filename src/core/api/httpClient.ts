import axios from "axios";
import type {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  AuthSessionPayload,
  SessionUser,
} from "../interfaces/auth.interface";

declare module "axios" {
  export interface AxiosRequestConfig {
    gmPublic?: boolean;
  }
}

const apiBase = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL;

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
    (payload && Object.values(payload)[0]) ??
    failure.message ??
    "No se pudo completar la solicitud";
  const error = new ApiError(
    Array.isArray(detail) ? detail.map(String).join(" ") : String(detail),
  );
  error.status = failure.response?.status;
  error.payload = payload;
  return error;
}

function isForbidden(failure: unknown): boolean {
  if (failure instanceof ApiError) return failure.status === 403;
  return axios.isAxiosError(failure) && failure.response?.status === 403;
}

function csrfCookie(): string {
  if (csrfToken) {
    return csrfToken;
  }

  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function getCsrfToken(): string {
  return csrfCookie();
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
  if (epoch !== sessionEpoch) {
    throw new Error("La sesión cambió. Vuelve a cargar la información.");
  }
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("gm-session-updated", { detail: user }),
    );
  }
}

function invalidateReads(): void {
  pendingReads.clear();
}

function sharedRead<T>(scope: string, load: () => Promise<T>): Promise<T> {
  const key = JSON.stringify([sessionEpoch, scope]);
  const existing = pendingReads.get(key);
  if (existing) return existing as Promise<T>;
  const operation = load().finally(() => {
    if (pendingReads.get(key) === operation) pendingReads.delete(key);
  });
  pendingReads.set(key, operation);
  return operation;
}

const bareClient = axios.create({
  baseURL: `${apiBase}/api/`,
  withCredentials: true,
});

async function prepareCsrf(): Promise<void> {
  try {
    const { data } = await bareClient.get<{ csrf_token: string }>("auth/csrf/");
    csrfToken = data.csrf_token;
  } catch (failure) {
    throw normalizeError(failure);
  }
}

async function ensureCsrf(): Promise<void> {
  if (!csrfCookie()) await prepareCsrf();
}

export function startSession(
  access: string | null,
  user: SessionUser,
): SessionUser {
  const nextPrincipal = sessionKey(user);

  if (principal && principal !== nextPrincipal) {
    sessionEpoch += 1;
    invalidateReads();
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
  invalidateReads();
  renewal = null;
  publishUser(null);
}

function expireSession(epoch: number): void {
  if (epoch !== sessionEpoch) return;
  clearAccess();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("gm-session-expired"));
  }
}

function getAccessToken(): string | null {
  return accessToken;
}

export function refreshSession(): Promise<SessionUser> {
  if (!renewal) {
    const epoch = sessionEpoch;

    const operation = (async () => {
      await ensureCsrf();
      checkSession(epoch);

      let payload: AuthSessionPayload;

      try {
        payload = (
          await httpClient.post<AuthSessionPayload>(
            "auth/refresh/",
            undefined,
            { gmPublic: true },
          )
        ).data;
      } catch (failure) {
        if (!isForbidden(failure)) throw failure;
        csrfToken = "";
        await prepareCsrf();
        checkSession(epoch);
        payload = (
          await httpClient.post<AuthSessionPayload>(
            "auth/refresh/",
            undefined,
            { gmPublic: true },
          )
        ).data;
      }

      checkSession(epoch);
      return startSession(payload.access ?? null, payload.user);
    })().finally(() => {
      if (renewal === operation) {
        renewal = null;
      }
    });

    renewal = operation;
  }

  return renewal;
}

async function renew(epoch: number): Promise<void> {
  try {
    await refreshSession();
    checkSession(epoch);
  } catch (failure) {
    expireSession(epoch);
    throw failure;
  }
}

export const httpClient = axios.create({
  baseURL: `${apiBase}/api/`,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

interface SessionConfig extends InternalAxiosRequestConfig {
  gmEpoch?: number;
  gmRetried?: boolean;
  gmAccess?: string | null;
  gmPublic?: boolean;
}

httpClient.interceptors.request.use(async (original) => {
  const config = original as SessionConfig;

  if (config.gmPublic) {
    if (!["get", "head", "options"].includes(config.method ?? "get")) {
      await ensureCsrf();
      config.headers.set("X-CSRFToken", getCsrfToken());
    }
    return config;
  }

  const epoch = config.gmEpoch ?? sessionVersion();
  config.gmEpoch = epoch;
  checkSession(epoch);

  if (!getAccessToken()) await renew(epoch);
  checkSession(epoch);

  const token = getAccessToken();
  if (!token) {
    expireSession(epoch);
    throw new ApiError("No se pudo obtener un token de sesión válido.");
  }

  config.gmAccess = token;
  config.headers.set("Authorization", `Bearer ${token}`);

  if (
    !["get", "head", "options"].includes(config.method ?? "get") &&
    getCsrfToken()
  )
    config.headers.set("X-CSRFToken", getCsrfToken());

  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    const config = response.config as SessionConfig;
    if (config.gmPublic) return response;
    checkSession(config.gmEpoch!);
    if (!["get", "head", "options"].includes(config.method ?? "get"))
      invalidateReads();
    return response;
  },
  async (failure: unknown) => {
    if (!axios.isAxiosError(failure) || !failure.config)
      throw normalizeError(failure);

    const config = failure.config as SessionConfig;
    if (config.gmPublic) throw normalizeError(failure);

    const epoch = config.gmEpoch;
    if (epoch === undefined) throw normalizeError(failure);

    checkSession(epoch);

    if (failure.response?.status === 401) {
      if (config.gmRetried) {
        expireSession(epoch);
      } else {
        config.gmRetried = true;
        if (!getAccessToken() || getAccessToken() === config.gmAccess)
          await renew(epoch);
        checkSession(epoch);
        return httpClient.request(config);
      }
    }

    throw normalizeError(failure);
  },
);

const request: typeof httpClient.request = httpClient.request.bind(httpClient);
httpClient.request = function requestSession<
  T = unknown,
  R = AxiosResponse<T>,
  D = unknown,
  P = unknown,
>(config: AxiosRequestConfig<D, P>) {
  const scoped = {
    ...config,
    gmEpoch: (config as SessionConfig).gmEpoch ?? sessionVersion(),
  };
  return request<T, R, D, P>(scoped);
};

const get: typeof httpClient.get = httpClient.get.bind(httpClient);
httpClient.get = function getShared<
  T = unknown,
  R = AxiosResponse<T>,
  D = unknown,
  P = unknown,
>(url: string, config?: AxiosRequestConfig<D, P>) {
  const scoped = { ...config, gmEpoch: sessionVersion() };
  if (config && Object.keys(config).length) return get<T, R, D, P>(url, scoped);
  return sharedRead(`axios:${url}`, () => get<T, R, D, P>(url, scoped));
};
