import { useState } from "react";
import { Link, useLocation } from "react-router";
import type { SessionUser } from "../../auth/api";
import ProfileMenu from "../../profile/ProfileMenu/ProfileMenu";
import ProjectsMenu from "./ProjectsMenu";
import { navigation } from "./sidebar-routes";
import ChevronsIcon from "../../../shared/Icons/ChevronsIcon";

interface SidebarProps {
  user: SessionUser;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { pathname } = useLocation();
  const isAdmin = user.permissions.manage_accounts;
  const entries = navigation.filter((entry) => !entry.requiresAdmin || isAdmin);

  return (
    <aside
      className={`sticky top-0 z-10 flex h-screen min-w-0 shrink-0 flex-col bg-neutral-50 dark:bg-neutral-900 p-2 pb-4 border-r border-neutral-200 dark:border-neutral-800 max-md:static max-md:h-auto max-md:max-h-[45dvh] max-md:w-full max-md:border-r-0 max-md:border-b ${
        isCollapsed ? "w-16 items-center px-2" : "w-64"
      }`}
    >
      <div
        className={`flex items-center py-2 ${isCollapsed ? "justify-center" : "justify-between"}`}
      >
        {!isCollapsed && (
          <span className="text-md text-neutral-800 dark:text-neutral-100 pl-3">
            Gestión de Proyectos
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-label={
            isCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"
          }
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          className="flex items-center justify-center p-1.5 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 rounded-xl cursor-pointer"
        >
          <ChevronsIcon
            className={`size-5 ${isCollapsed ? "-rotate-90" : "rotate-90"}`}
          />
        </button>
      </div>

      <nav
        id="sidebar-navigation"
        aria-label="Navegación principal"
        className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="flex flex-col gap-1.5 mt-3">
          {entries.map((entry) => {
            const Icon = entry.icon;
            const isActive =
              entry.path === "/"
                ? pathname === "/"
                : pathname === entry.path ||
                  pathname.startsWith(`${entry.path}/`);

            return (
              <Link
                key={entry.path}
                to={entry.path}
                aria-label={entry.label}
                title={entry.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm rounded-xl cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700 ${
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <span
                  className="size-5 shrink-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Icon className="size-5" fill={false} />
                </span>
                {!isCollapsed && <span>{entry.label}</span>}
              </Link>
            );
          })}
          <div className="mt-3">
            <ProjectsMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </nav>

      <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
        <ProfileMenu
          user={user}
          onLogout={onLogout}
          isCollapsed={isCollapsed}
        />
      </div>
    </aside>
  );
}
