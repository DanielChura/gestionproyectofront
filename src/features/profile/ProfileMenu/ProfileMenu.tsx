import { lazy, Suspense, useState } from "react";
import LogoutIcon from "../../../shared/icons/LogoutIcon";
import SettingsIcon from "../../../shared/icons/SettingsIcon";
import Avatar from "../../../shared/Avatar";
import type { SessionUser } from "../../../core/interfaces/auth.interface";
import { roleLabel } from "../../auth/roles";

const SettingsModal = lazy(() => import("../../settings/SettingsModal"));

interface ProfileMenuProps {
  user: SessionUser;
  onLogout: () => void;
  isCollapsed: boolean;
}

function ProfileMenu({ user, onLogout, isCollapsed }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const item =
    "w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer text-left";

  return (
    <div
      className={`relative w-full ${isCollapsed ? "flex justify-center" : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menú de perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex min-w-0 cursor-pointer ${
          isCollapsed
            ? "justify-center"
            : "w-full items-start gap-2.5 p-1 text-left"
        }`}
      >
        <Avatar
          name={user.name}
          className="size-8 rounded-full text-xs"
          aria-hidden="true"
        />
        {!isCollapsed && (
          <div className="flex flex-1 flex-col items-start min-w-0 text-left">
            <span className="line-clamp-1 text-sm text-neutral-800 dark:text-neutral-100 leading-tight">
              {user.name}
            </span>
            <span className="line-clamp-1 text-xs text-neutral-600 dark:text-neutral-400 leading-tight mt-0.5">
              {roleLabel(user.role)}
            </span>
          </div>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-4 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
              className={item}
            >
              <SettingsIcon className="size-4 flex-none" aria-hidden="true" />
              Configuración
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={item}
            >
              <LogoutIcon className="size-4 flex-none" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default ProfileMenu;
