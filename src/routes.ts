import { lazy } from "react";
import type { ComponentType } from "react";

export const DashboardPage = lazy(
  () => import("./features/dashboard/DashboardPage/DashboardPage"),
);
export const ProjectList = lazy(
  () => import("./features/projects/ProjectList/ProjectList"),
);
export const ProjectRoute = lazy(
  () => import("./features/projects/ProjectRoute/ProjectRoute"),
);

export const PublicationsPage = lazy(
  () => import("./features/publications/PublicationsPage"),
);
const WorkersPage = lazy(() => import("./features/workers/WorkersPage"));
const OrganizationPage = lazy(
  () => import("./features/organization/OrganizationPage"),
);
const TeamsPage = lazy(() => import("./features/teams/TeamsPage"));
const TeamDetailPage = lazy(() => import("./features/teams/TeamDetailPage"));
const AccountsPage = lazy(() => import("./features/accounts/AccountsPage"));
const RecoveryRequestsPage = lazy(
  () => import("./features/recovery-requests/RecoveryRequestsPage"),
);
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));

export interface AppRoute {
  path: string;
  Component: ComponentType<any>;
  requiresAdmin: boolean;
}

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    Component: DashboardPage,
    requiresAdmin: false,
  },
  {
    path: "/publicaciones",
    Component: PublicationsPage,
    requiresAdmin: false,
  },
  {
    path: "/proyectos",
    Component: ProjectList,
    requiresAdmin: false,
  },
  {
    path: "/proyectos/resumen",
    Component: ProjectList,
    requiresAdmin: false,
  },
  {
    path: "/proyectos/:projectId",
    Component: ProjectRoute,
    requiresAdmin: false,
  },

  {
    path: "/cuentas",
    Component: AccountsPage,
    requiresAdmin: true,
  },
  {
    path: "/recuperaciones",
    Component: RecoveryRequestsPage,
    requiresAdmin: true,
  },
  {
    path: "/trabajadores",
    Component: WorkersPage,
    requiresAdmin: true,
  },
  {
    path: "/equipos",
    Component: TeamsPage,
    requiresAdmin: false,
  },
  {
    path: "/equipos/:teamId",
    Component: TeamDetailPage,
    requiresAdmin: false,
  },
  {
    path: "/organizacion",
    Component: OrganizationPage,
    requiresAdmin: false,
  },
  {
    path: "/configuracion",
    Component: SettingsPage,
    requiresAdmin: false,
  },
];

export function projectPath(projectId: number): string {
  return `/proyectos/${projectId}`;
}


