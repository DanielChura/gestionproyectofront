import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SessionUser } from "./core/interfaces/auth.interface";
import { errorText } from "./core/api/httpClient";
import {
  clearAccess,
  logout,
  refreshSession,
  sessionKey,
} from "./core/services/authService";
import { LoadingProvider } from "./context/LoadingContext";
import { ToastProvider } from "./context/ToastContext";
import { useLoading } from "./hooks/useLoading";
import { useToast } from "./hooks/useToast";
import AppShell from "./features/layout/AppShell/AppShell";
import { Toast } from "./shared/components/Toast/Toast";

const LoginPage = lazy(() => import("./features/auth/AuthPages/LoginPage"));
const PasswordPage = lazy(
  () => import("./features/auth/AuthPages/PasswordPage"),
);
const RecoveryPage = lazy(
  () => import("./features/auth/AuthPages/RecoveryPage"),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const SESSION_USER_KEY = "gm-session-user";

function savedSessionUser(): SessionUser | null {
  try {
    const value = sessionStorage.getItem(SESSION_USER_KEY);
    return value ? (JSON.parse(value) as SessionUser) : null;
  } catch {
    return null;
  }
}

function saveSessionUser(user: SessionUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_USER_KEY);
    }
  } catch {
    // sessionStorage can be unavailable in restricted browser modes.
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { hideLoading, isLoading } = useLoading();
  const { addToast } = useToast();

  const [user, setUser] = useState<SessionUser | null>(savedSessionUser);
  const navigate = useNavigate();

  useEffect(() => {
    saveSessionUser(user);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    refreshSession()
      .then((sessionUser) => {
        if (mounted) setUser(sessionUser);
      })
      .catch(() => {
        if (mounted) {
          clearAccess();
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) hideLoading();
      });
    return () => {
      mounted = false;
    };
  }, [hideLoading]);

  useEffect(() => {
    const expire = () => {
      queryClient.clear();
      setUser(null);
    };
    const update = (event: Event) => {
      if (event instanceof CustomEvent) setUser(event.detail as SessionUser);
    };
    window.addEventListener("gm-session-expired", expire);
    window.addEventListener("gm-session-updated", update);
    return () => {
      window.removeEventListener("gm-session-expired", expire);
      window.removeEventListener("gm-session-updated", update);
    };
  }, []);

  async function signOut() {
    try {
      await logout();
      queryClient.clear();
      setUser(null);
      navigate("/", { replace: true });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo cerrar sesión",
        message: errorText(failure),
      });
    }
  }

  return (
    <>
      <Toast />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/activar" element={<PasswordPage mode="activate" />} />
          <Route
            path="/restablecer"
            element={<PasswordPage mode="reset" />}
          />
          <Route path="/recuperar" element={<RecoveryPage />} />
          <Route
            path="/*"
            element={
              user || isLoading ? (
                <AppShell
                  key={user ? sessionKey(user) : "boot"}
                  user={user}
                  onLogout={signOut}
                />
              ) : (
                <LoginPage onLogin={setUser} />
              )
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
