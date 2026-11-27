import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { errorText } from "./core/api/httpClient";
import {
  clearAccess,
  logout,
  refreshSession,
  sessionKey,
} from "./core/services/authService";
import { LoadingProvider } from "./context/LoadingContext";
import { ToastProvider } from "./context/ToastContext";
import { useAuth } from "./hooks/useAuth";
import { useLoading } from "./hooks/useLoading";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useAccentColor } from "./hooks/useAccentColor";
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
  useTheme();
  useAccentColor();
  const { hideLoading, isLoading } = useLoading();
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshSession().catch(clearAccess).finally(hideLoading);
  }, [hideLoading]);

  useEffect(() => {
    if (!user) queryClient.clear();
  }, [user]);

  async function signOut() {
    try {
      await logout();
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
          <Route path="/restablecer" element={<PasswordPage mode="reset" />} />
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
                <LoginPage />
              )
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
