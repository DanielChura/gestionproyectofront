import { Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import { appRoutes, PublicationsPage } from "../../../routes";
import type { SessionUser } from "../../auth/api";
import NotAvailable from "../NotAvailable/NotAvailable";
import Sidebar from "../Sidebar/Sidebar";

interface AppShellProps {
  user: SessionUser;
  onLogout: () => void;
  logoutError?: string;
}

export default function AppShell({
  user,
  onLogout,
  logoutError,
}: AppShellProps) {
  const { pathname } = useLocation();
  const canViewAdmin = user.permissions.manage_accounts;
  const projectWorkspace = /^\/proyectos\/\d+$/.test(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950/10 dark:text-neutral-100 md:h-screen md:flex-row">
      <Sidebar user={user} onLogout={onLogout} />
      <div
        className={`min-w-0 w-full flex-1 bg-white dark:bg-neutral-950/50 pb-0! p-3 md:p-6 ${
          projectWorkspace ? "md:overflow-hidden" : "md:overflow-y-auto"
        }`}
      >
        {logoutError && (
          <p
            role="alert"
            className="mb-4 text-sm text-neutral-800 dark:text-neutral-200"
          >
            {logoutError}
          </p>
        )}
        <Suspense fallback={null}>
          <Routes>
            {appRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  route.requiresAdmin && !canViewAdmin ? (
                    <NotAvailable />
                  ) : route.Component === PublicationsPage ? (
                    <route.Component
                      canManage={user.role === "ADMINISTRADOR"}
                    />
                  ) : (
                    <route.Component />
                  )
                }
              />
            ))}
            <Route path="*" element={<NotAvailable />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
