import { Link } from "react-router";
import PlusIcon from "../../../../../shared/icons/PlusIcon";
import NavLinks from "../NavLinks/NavLinks";
import NavGroup from "../NavGroup/NavGroup";
import MyTeams from "../../MyTeams/MyTeams";
import type { SubRoute } from "../../../../../routes";

interface TeamsNavProps {
  items: SubRoute[];
  pathname: string;
  canManage: boolean;
}

export default function TeamsNav({
  items,
  pathname,
  canManage,
}: TeamsNavProps) {
  return (
    <>
      <div className="mb-1 flex flex-col gap-1">
        {canManage ? (
          <Link to="/equipos/todos?nuevo=equipo" className="badge">
            <PlusIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Crear equipo</span>
          </Link>
        ) : (
          <span className="badge cursor-not-allowed opacity-30">
            <PlusIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Crear equipo</span>
          </span>
        )}
      </div>

      <NavLinks items={items} pathname={pathname} />

      <NavGroup title="Mis equipos">
        <MyTeams />
      </NavGroup>
    </>
  );
}
