import { lazy } from "react";
import type { ComponentType } from "react";
import DashboardIcon from "./shared/icons/Dashboard";
import TeamsIcon from "./shared/icons/TeamsIcon";
import BuildingIcon from "./shared/icons/BuildingIcon";
import FileIcon from "./shared/icons/FileIcon";
import FolderIcon from "./shared/icons/FolderIcon";
import UserIcon from "./shared/icons/UserIcon";
import KeyIcon from "./shared/icons/KeyIcon";
import ClockIcon from "./shared/icons/ClockIcon";
import IdIcon from "./shared/icons/IdIcon";
import PlusIcon from "./shared/icons/PlusIcon";

export const HomeRedirect = lazy(() => import("./features/home/HomeRedirect"));
export const HomePage = lazy(() => import("./features/home/HomePage"));
export const PublicationsPage = lazy(
  () => import("./features/publications/PublicationsPage"),
);
const TeamsPage = lazy(() => import("./features/teams/TeamsPage"));
const TeamDetailPage = lazy(() => import("./features/teams/TeamDetailPage"));
const StructurePage = lazy(
  () => import("./features/organizations/structure/StructurePage"),
);
const AccountsPage = lazy(
  () => import("./features/organizations/accounts/AccountsPage"),
);
const RecoveryRequestsPage = lazy(
  () =>
    import("./features/organizations/recovery-requests/RecoveryRequestsPage"),
);

export interface SubRoute {
  title: string;
  path: string;
  Icon: ComponentType<{ className?: string; fill?: boolean }>;
  Component: ComponentType<{ canManage?: boolean }>;
  hidden?: boolean;
}

export interface NavModule {
  label: string;
  Icon: ComponentType<{ className?: string; fill?: boolean }>;
  path: string;
  requiresAdmin?: boolean;
  subRoutes: SubRoute[];
}

export const appModules: NavModule[] = [
  {
    label: "Inicio",
    Icon: DashboardIcon,
    path: "/",
    subRoutes: [
      {
        title: "Ver publicaciones",
        path: "/publicaciones",
        Icon: FileIcon,
        Component: PublicationsPage,
      },

      {
        title: "Inicio",
        path: "/",
        Icon: ClockIcon,
        Component: HomeRedirect,
        hidden: true,
      },
      {
        title: "Detalle de proyecto",
        path: "/proyectos/:projectId",
        Icon: FolderIcon,
        Component: HomePage,
        hidden: true,
      },
    ],
  },
  {
    label: "Equipos",
    Icon: TeamsIcon,
    path: "/equipos/todos",
    subRoutes: [
      {
        title: "Todos los equipos",
        path: "/equipos/todos",
        Icon: TeamsIcon,
        Component: TeamsPage,
      },
      {
        title: "Todos los trabajadores",
        path: "/equipos/trabajadores",
        Icon: IdIcon,
        Component: TeamsPage,
      },
      {
        title: "Equipos",
        path: "/equipos",
        Icon: TeamsIcon,
        Component: TeamsPage,
        hidden: true,
      },
      {
        title: "Detalle de equipo",
        path: "/equipos/:teamId",
        Icon: TeamsIcon,
        Component: TeamDetailPage,
        hidden: true,
      },
    ],
  },
  {
    label: "Organización",
    Icon: BuildingIcon,
    path: "/organizaciones/estructura",
    requiresAdmin: true,
    subRoutes: [
      {
        title: "Crear proyecto",
        path: "/organizaciones/estructura?modal=proyecto",
        Icon: PlusIcon,
        Component: StructurePage,
      },
      {
        title: "Crear especialidad",
        path: "/organizaciones/estructura?modal=especialidad",
        Icon: FileIcon,
        Component: StructurePage,
      },
      {
        title: "Áreas y proyectos",
        path: "/organizaciones/estructura",
        Icon: FolderIcon,
        Component: StructurePage,
      },
      {
        title: "Cuentas y accesos",
        path: "/organizaciones/cuentas",
        Icon: UserIcon,
        Component: AccountsPage,
      },
      {
        title: "Recuperaciones",
        path: "/organizaciones/recuperaciones",
        Icon: KeyIcon,
        Component: RecoveryRequestsPage,
      },
      {
        title: "Organización",
        path: "/organizaciones",
        Icon: BuildingIcon,
        Component: StructurePage,
        hidden: true,
      },
      {
        title: "Áreas",
        path: "/organizaciones/areas",
        Icon: FolderIcon,
        Component: StructurePage,
        hidden: true,
      },
      {
        title: "Especialidades",
        path: "/organizaciones/especialidades",
        Icon: FileIcon,
        Component: StructurePage,
        hidden: true,
      },
    ],
  },
];

export const allRoutes = appModules.flatMap((module) =>
  module.subRoutes.map((sub) => ({
    ...sub,
    requiresAdmin: Boolean(module.requiresAdmin),
  })),
);

export function projectPath(projectId: number | string): string {
  return `/proyectos/${projectId}`;
}

export function teamPath(teamId: number | string): string {
  return `/equipos/${teamId}`;
}
