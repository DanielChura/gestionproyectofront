import SidebarIcon from "../../../../shared/icons/SidebarIcon";
import HomeMenu from "./HomeMenu/HomeMenu";
import TeamsMenu from "./TeamsMenu/TeamsMenu";
import OrganizationMenu from "./OrganizationMenu/OrganizationMenu";
import MenuLinks from "./MenuLinks/MenuLinks";
import { useSectionMenu } from "./useSectionMenu";
import type { NavModule } from "../../../../routes";

interface SectionMenuProps {
  activeModule: NavModule;
  pathname: string;
  canManage: boolean;
  onClose: () => void;
}

export default function SectionMenu({
  activeModule,
  pathname,
  canManage,
  onClose,
}: SectionMenuProps) {
  const { items, isHome, isTeams, isOrganization } =
    useSectionMenu(activeModule);

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 md:w-60">
      <header className="flex items-center justify-between gap-2 p-4">
        <h2 className="m-0 font-medium text-neutral-800 dark:text-neutral-100">
          {activeModule.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Ocultar panel"
          className="cursor-pointer rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <SidebarIcon className="size-4" />
        </button>
      </header>

      <nav
        aria-label={`Opciones de ${activeModule.label}`}
        className="min-h-0 flex-1 overflow-y-auto px-3"
      >
        {isHome && <HomeMenu items={items} pathname={pathname} canManage={canManage} />}
        {isTeams && (
          <TeamsMenu items={items} pathname={pathname} canManage={canManage} />
        )}
        {isOrganization && (
          <OrganizationMenu items={items} pathname={pathname} />
        )}
        {!isHome && !isTeams && !isOrganization && (
          <MenuLinks items={items} pathname={pathname} />
        )}
      </nav>
    </aside>
  );
}
