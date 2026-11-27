import SidebarIcon from "../../../../shared/icons/SidebarIcon";
import HomeNav from "./HomeNav/HomeNav";
import TeamsNav from "./TeamsNav/TeamsNav";
import OrganizationNav from "./OrganizationNav/OrganizationNav";
import NavLinks from "./NavLinks/NavLinks";
import { useSectionNav } from "./useSectionNav";
import type { NavModule } from "../../../../routes";

interface SectionNavProps {
  activeModule: NavModule;
  pathname: string;
  canManage: boolean;
  onClose: () => void;
}

export default function SectionNav({
  activeModule,
  pathname,
  canManage,
  onClose,
}: SectionNavProps) {
  const { items, isHome, isTeams, isOrganization } =
    useSectionNav(activeModule);

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 md:w-60">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="m-0 text-base font-medium text-neutral-700 dark:text-neutral-100">
          {activeModule.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Ocultar panel"
          className="cursor-pointer rounded-md p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <SidebarIcon className="size-4" />
        </button>
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3">
        {isHome && (
          <HomeNav items={items} pathname={pathname} canManage={canManage} />
        )}
        {isTeams && (
          <TeamsNav items={items} pathname={pathname} canManage={canManage} />
        )}
        {isOrganization && (
          <OrganizationNav items={items} pathname={pathname} />
        )}
        {!isHome && !isTeams && !isOrganization && (
          <NavLinks items={items} pathname={pathname} />
        )}
      </nav>
    </aside>
  );
}
