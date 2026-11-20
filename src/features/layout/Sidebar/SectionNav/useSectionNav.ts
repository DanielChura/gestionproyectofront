import type { NavModule, SubRoute } from "../../../../routes";

export function useSectionNav(activeModule: NavModule) {
  const items: SubRoute[] = activeModule.subRoutes.filter(
    (item) => !item.path.includes(":") && !item.hidden,
  );

  return {
    items,
    isHome: activeModule.path === "/",
    isTeams: activeModule.path.startsWith("/equipos"),
    isOrganization: activeModule.path.startsWith("/organizaciones"),
  };
}
