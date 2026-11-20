import { useState, useMemo } from "react";
import { useLocation, matchPath } from "react-router";
import { appModules } from "../../../routes";
import type { SessionUser } from "../../../core/interfaces/auth.interface";
import Sidebar from "../Sidebar/Sidebar";
import SectionNav from "../Sidebar/SectionNav/SectionNav";
import SidebarHighlights from "../Sidebar/Highlights/SidebarHighlights";
import AppRoutes from "./AppRoutes";
import { GlobalLoading } from "../../../shared/states/GlobalLoading/GlobalLoading";
import { useLoading } from "../../../hooks/useLoading";

interface AppShellProps {
  user: SessionUser | null;
  onLogout: () => void;
}

export default function AppShell({ user, onLogout }: AppShellProps) {
  const { pathname } = useLocation();
  const { isLoading } = useLoading();
  const [menuOpen, setMenuOpen] = useState(true);
  const canViewAdmin = user?.permissions.manage_accounts ?? false;

  const activeModule = useMemo(() => {
    const matched = appModules.filter((module) =>
      module.subRoutes.some((sub) => matchPath(sub.path, pathname)),
    );
    if (matched.length === 0) return appModules[0];
    if (matched.length === 1) return matched[0];
    return matched.find((m) => m.path !== "/") || matched[0];
  }, [pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white p-2 text-neutral-900 dark:bg-neutral-950/50 dark:text-neutral-100 gap-2">
      <Sidebar
        modules={appModules}
        activePath={activeModule.path}
        user={user}
        onLogout={onLogout}
        onSectionSelect={() => setMenuOpen(true)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
        <div className="flex min-h-0 min-w-0 flex-1">
          {menuOpen && activeModule.subRoutes.length > 0 && (
            <SectionNav
              activeModule={activeModule}
              pathname={pathname}
              canManage={canViewAdmin}
              onClose={() => setMenuOpen(false)}
            />
          )}

          <main
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
              isLoading ? "" : "p-4 pb-1"
            }`}
          >
            {isLoading ? (
              <GlobalLoading />
            ) : (
              <AppRoutes canManage={canViewAdmin} />
            )}
          </main>
        </div>

        <SidebarHighlights />
      </div>
    </div>
  );
}
