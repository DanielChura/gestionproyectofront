import NavLinks from "../NavLinks/NavLinks";
import type { SubRoute } from "../../../../../routes";

interface OrganizationNavProps {
  items: SubRoute[];
  pathname: string;
}

export default function OrganizationNav({
  items,
  pathname,
}: OrganizationNavProps) {
  return <NavLinks items={items} pathname={pathname} />;
}
