import MenuLinks from "../MenuLinks/MenuLinks";
import type { SubRoute } from "../../../../../routes";

interface OrganizationMenuProps {
  items: SubRoute[];
  pathname: string;
}

export default function OrganizationMenu({
  items,
  pathname,
}: OrganizationMenuProps) {
  return <MenuLinks items={items} pathname={pathname} />;
}
