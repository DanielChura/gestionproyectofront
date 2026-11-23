import {
  clearAccess,
  getSessionUser,
  httpClient,
  refreshSession,
  sessionKey,
  startSession,
  subscribeSession,
} from "../api/httpClient";
import type {
  Account,
  ActivationDetails,
  AuthSessionPayload,
  DetailResult,
  InvitationPayload,
  PasswordPayload,
  RecoveryRequest,
  SessionProfile,
  SessionUser,
} from "../interfaces/auth.interface";

export type PasswordMode = "activate" | "reset";
export { clearAccess, refreshSession, sessionKey };

type PaginatedResponse<T> =
  T[] | { results?: T[]; next_cursor?: string | null };

function passwordPath(mode: PasswordMode): string {
  return mode === "activate" ? "auth/activate/" : "auth/reset/";
}

async function listAll<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ page_size: "50" });
    if (cursor) query.set("cursor", cursor);
    const { data } = await httpClient.get<PaginatedResponse<T>>(
      `${path}?${query.toString()}`,
    );
    const pageRows = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    rows.push(...pageRows);
    cursor = Array.isArray(data) ? null : (data?.next_cursor ?? null);
    if (!cursor) break;
  }

  return rows;
}

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  clearAccess();
  const { data } = await httpClient.post<AuthSessionPayload>(
    "auth/login/",
    { email, password },
    { gmPublic: true },
  );
  return startSession(data.access ?? null, data.user);
}

export async function logout(): Promise<void> {
  await httpClient.post<DetailResult>("auth/logout/");
  clearAccess();
}

export async function getSessionProfile(): Promise<SessionProfile> {
  const { data } = await httpClient.get<SessionProfile>("auth/me/");
  return data;
}

export async function updateSessionProfile(payload: {
  first_names?: string;
  last_names?: string;
  email?: string;
  password?: string;
}): Promise<SessionProfile> {
  const { data } = await httpClient.patch<SessionProfile>("auth/me/", payload);
  return data;
}

export async function requestRecovery(email: string): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(
    "auth/recovery-requests/",
    { email },
    { gmPublic: true },
  );
  return data;
}

export async function previewPassword(
  mode: PasswordMode,
  token: string,
): Promise<ActivationDetails> {
  const { data } = await httpClient.post<ActivationDetails>(
    `${passwordPath(mode)}preview/`,
    { token },
    { gmPublic: true },
  );
  return data;
}

export async function validatePassword(
  mode: PasswordMode,
  payload: PasswordPayload,
): Promise<void> {
  await httpClient.post<unknown>(
    `${passwordPath(mode)}validate-password/`,
    payload,
    { gmPublic: true },
  );
}

export async function savePassword(
  mode: PasswordMode,
  payload: PasswordPayload,
): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(
    passwordPath(mode),
    payload,
    { gmPublic: true },
  );
  return data;
}

export async function listAccounts(): Promise<Account[]> {
  return listAll<Account>("auth/admin/accounts/");
}

export async function resendInvitation(
  accountId: number,
): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(
    `auth/admin/accounts/${accountId}/resend-invitation/`,
  );
  return data;
}

export async function unlockAccount(accountId: number): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(
    `auth/admin/accounts/${accountId}/unlock/`,
  );
  return data;
}

export async function createInvitation(
  payload: InvitationPayload,
): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(
    "auth/admin/invitations/",
    payload,
  );
  return data;
}

export async function listRecoveryRequests(): Promise<RecoveryRequest[]> {
  return listAll<RecoveryRequest>("auth/admin/recovery-requests/");
}

export async function issueReset(requestId: number): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(
    `auth/admin/recovery-requests/${requestId}/issue-reset/`,
  );
  return data;
}

export const authService = {
  getUser: getSessionUser,
  subscribe: subscribeSession,
  sessionKey,

  isAdmin(): boolean {
    const user = getSessionUser();
    if (!user) return false;
    return user.role === "admin" || Boolean(user.permissions?.manage_accounts);
  },

  hasPermission(permission: keyof SessionUser["permissions"]): boolean {
    return Boolean(getSessionUser()?.permissions?.[permission]);
  },

  isAuthenticated(): boolean {
    return getSessionUser() !== null;
  },

  login,
  logout,
  refreshSession,
  clearAccess,
  getSessionProfile,
  updateSessionProfile,
  requestRecovery,
  previewPassword,
  validatePassword,
  savePassword,
  listAccounts,
  resendInvitation,
  unlockAccount,
  createInvitation,
  listRecoveryRequests,
  issueReset,
};
