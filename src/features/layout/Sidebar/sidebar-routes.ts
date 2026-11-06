import type { ComponentType } from "react";
import AdminIcon from "../../../shared/Icons/AdminIcon";
import FolderIcon from "../../../shared/Icons/FolderIcon";
import KeyIcon from "../../../shared/Icons/KeyIcon";
import TeamsIcon from "../../../shared/Icons/TeamsIcon";
import type { IconProps } from "../../../shared/Icons/types";
import BriefcaseIcon from "../../../shared/Icons/BriefcaseIcon";
import TablerIcon from "../../../shared/Icons/TablerIcon";
import DashboardIcon from "../../../shared/Icons/Dashboard";

export interface NavigationEntry {
  label: string;
  path: string;
  icon: ComponentType<IconProps>;
  requiresAdmin: boolean;
}

export const navigation: NavigationEntry[] = [
  { label: "Inicio", path: "/", icon: DashboardIcon, requiresAdmin: false },
  {
    label: "Publicaciones",
    path: "/publicaciones",
    icon: TablerIcon,
    requiresAdmin: false,
  },
  {
    label: "Trabajadores",
    path: "/trabajadores",
    icon: TeamsIcon,
    requiresAdmin: true,
  },
  {
    label: "Equipos",
    path: "/equipos",
    icon: BriefcaseIcon,
    requiresAdmin: false,
  },
  {
    label: "Organización",
    path: "/organizacion",
    icon: FolderIcon,
    requiresAdmin: false,
  },
  {
    label: "Cuentas y accesos",
    path: "/cuentas",
    icon: AdminIcon,
    requiresAdmin: true,
  },
  {
    label: "Recuperaciones",
    path: "/recuperaciones",
    icon: KeyIcon,
    requiresAdmin: true,
  },
];
