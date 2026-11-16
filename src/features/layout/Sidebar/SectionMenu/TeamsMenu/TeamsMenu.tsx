import { Link } from "react-router";
import PlusIcon from "../../../../../shared/icons/PlusIcon";
import MenuLinks from "../MenuLinks/MenuLinks";
import MenuGroup from "../MenuGroup/MenuGroup";
import MyTeams from "../../MyTeams/MyTeams";
import type { SubRoute } from "../../../../../routes";

interface TeamsMenuProps {
  items: SubRoute[];
  pathname: string;
  canManage: boolean;
}

export default function TeamsMenu({
  items,
  pathname,
  canManage,
}: TeamsMenuProps) {
  return (
    <>
      <div className="mb-1 flex flex-col gap-1">
        {canManage ? (
          <Link to="/equipos/todos?nuevo=equipo" className="badge">
            <PlusIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Crear equipo</span>
          </Link>
        ) : (
          <span
            title="Solo administradores"
            className="badge cursor-not-allowed opacity-30"
          >
            <PlusIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Crear equipo</span>
          </span>
        )}
      </div>

      <MenuLinks items={items} pathname={pathname} />

      <MenuGroup title="Mis equipos">
        <MyTeams />
      </MenuGroup>
    </>
  );
}
