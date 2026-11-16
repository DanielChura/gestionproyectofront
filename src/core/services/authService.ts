import type { SessionUser } from "../../features/auth/api";

let currentUser: SessionUser | null = null;
const listeners = new Set<(user: SessionUser | null) => void>();

export const authService = {
  getUser(): SessionUser | null {
    return currentUser;
  },

  setUser(user: SessionUser | null): void {
    currentUser = user;
    listeners.forEach((listener) => listener(currentUser));
  },

  isAdmin(): boolean {
    if (!currentUser) return false;
    return (
      currentUser.role === "admin" ||
      Boolean(currentUser.permissions?.manage_accounts)
    );
  },

  hasPermission(permission: keyof SessionUser["permissions"]): boolean {
    return Boolean(currentUser?.permissions?.[permission]);
  },

  isAuthenticated(): boolean {
    return currentUser !== null;
  },

  subscribe(callback: (user: SessionUser | null) => void): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
