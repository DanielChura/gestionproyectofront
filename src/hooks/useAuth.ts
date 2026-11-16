import { useSyncExternalStore } from "react";
import { authService } from "../core/services/authService";

export function useAuth() {
  const user = useSyncExternalStore(
    authService.subscribe,
    authService.getUser,
    authService.getUser,
  );

  return {
    user,
    isAuthenticated: user !== null,
    isAdmin: authService.isAdmin(),
    hasPermission: authService.hasPermission,
    role: user?.role ?? null,
  };
}
