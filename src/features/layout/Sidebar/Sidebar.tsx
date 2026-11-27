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
    <aside className="sidebar-solid flex w-14 shrink-0 flex-col items-center gap-2 rounded-xl p-2 max-md:w-full max-md:flex-row max-md:justify-between">
      <Link
        to="/"
        onClick={onSectionSelect}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center"
        aria-label="Ir al inicio"
      >
        <img src={gmLogoSmall} alt="" className="h-6 w-auto" />
      </Link>

      <nav className="flex w-full min-h-0 flex-1 flex-col items-center gap-1 pt-1 max-md:flex-row max-md:justify-center max-md:pt-0 overflow-hidden">
        {modules.map((module) => {
          const Icon = module.Icon;
          const active = activePath === module.path;
          const disabled = !!module.requiresAdmin && !canManage;

          const content = (
            <>
              <span
                className={`flex items-center justify-center rounded-md p-1.5 ${
                  active ? "bg-white/15" : "group-hover:bg-white/10"
                }`}
              >
                <Icon className="size-5 shrink-0" fill={active} />
              </span>

              <span className={active ? "font-medium" : ""}>
                {module.label}
              </span>
            </>
          );

          if (disabled) {
            return (
              <span
                key={module.path}
                className="sidebar-item cursor-not-allowed"
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={module.path}
              to={module.path}
              onClick={onSectionSelect}
              aria-current={active ? "page" : undefined}
              className="sidebar-item group"
            >
              {content}
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
