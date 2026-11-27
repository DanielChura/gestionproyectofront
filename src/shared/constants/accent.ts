export interface AccentOption {
  id: string;
  name: string;
  hex: string;
  btnBg?: string;
  btnHover?: string;
  sidebarBg: {
    light: string;
    dark: string;
  };
}

export const ACCENT_OPTIONS: AccentOption[] = [
  {
    id: "default",
    name: "Predeterminado",
    hex: "#171717",
    sidebarBg: { light: "#0a0a0a", dark: "#0a0a0a" },
  },
  {
    id: "blue",
    name: "Azul",
    hex: "#2563eb",
    btnBg: "#2563eb",
    btnHover: "#1d4ed8",
    sidebarBg: { light: "#1e40af", dark: "#172554" },
  },
  {
    id: "indigo",
    name: "Índigo",
    hex: "#4f46e5",
    btnBg: "#4f46e5",
    btnHover: "#4338ca",
    sidebarBg: { light: "#3730a3", dark: "#1e1b4b" },
  },
  {
    id: "purple",
    name: "Púrpura",
    hex: "#7c3aed",
    btnBg: "#7c3aed",
    btnHover: "#6d28d9",
    sidebarBg: { light: "#5b21b6", dark: "#2e1065" },
  },
  {
    id: "emerald",
    name: "Esmeralda",
    hex: "#059669",
    btnBg: "#059669",
    btnHover: "#047857",
    sidebarBg: { light: "#065f46", dark: "#022c22" },
  },
  {
    id: "amber",
    name: "Ámbar",
    hex: "#d97706",
    btnBg: "#d97706",
    btnHover: "#b45309",
    sidebarBg: { light: "#92400e", dark: "#451a03" },
  },
  {
    id: "rose",
    name: "Rosa",
    hex: "#e11d48",
    btnBg: "#e11d48",
    btnHover: "#be123c",
    sidebarBg: { light: "#9f1239", dark: "#4c0519" },
  },
];
