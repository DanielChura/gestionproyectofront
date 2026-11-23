import { Link } from "react-router";
import type { SessionUser } from "../../../core/interfaces/auth.interface";
import ProfileMenu from "../../profile/ProfileMenu/ProfileMenu";
import InviteButton from "./InviteButton/InviteButton";
import type { NavModule } from "../../../routes";
import gmLogoSmall from "../../../assets/gm-logo-small.png";

interface SidebarProps {
  modules: NavModule[];
  activePath: string;
  user: SessionUser | null;
  onLogout: () => void;
  onSectionSelect: () => void;
}

export default function Sidebar({
  modules,
  activePath,
  user,
  onLogout,
  onSectionSelect,
}: SidebarProps) {
  const canManage = user?.permissions.manage_accounts ?? false;

  return (
    <aside className="flex w-15 shrink-0 flex-col items-center gap-2 rounded-lg bg-neutral-950 dark:bg-neutral-900 p-2 max-md:w-full max-md:flex-row max-md:justify-between">
      <Link
        to="/"
        onClick={onSectionSelect}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center"
        aria-label="Ir al inicio"
      >
        <img src={gmLogoSmall} alt="" className="h-7 w-auto" />
      </Link>

      <nav className="flex w-full min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden pt-1 max-md:flex-row max-md:justify-center max-md:overflow-visible max-md:pt-0">
        {modules.map((module) => {
          const Icon = module.Icon;
          const active = activePath === module.path;
          const disabled = !!module.requiresAdmin && !canManage;

          if (disabled) {
            return (
              <span
                key={module.path}
                className="sidebar-item cursor-not-allowed opacity-30"
              >
                <Icon className="size-5 shrink-0" fill={false} />
                <span className="max-w-full min-w-0 truncate">
                  {module.label}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={module.path}
              to={module.path}
              onClick={onSectionSelect}
              aria-current={active ? "page" : undefined}
              className={`sidebar-item ${
                active ? "bg-neutral-800 text-neutral-100" : ""
              }`}
            >
              <Icon className="size-5 shrink-0" fill={false} />
              <span className="max-w-full min-w-0 ">{module.label}</span>
            </Link>
          );
        })}
        <InviteButton canManage={canManage} />
      </nav>

      {user && (
        <div className="mt-auto w-full p-1 max-md:ml-auto max-md:mt-0 max-md:w-auto max-md:pt-0">
          <ProfileMenu user={user} onLogout={onLogout} isCollapsed />
        </div>
      )}
    </aside>
  );
}
