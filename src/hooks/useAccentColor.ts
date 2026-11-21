import { useCallback, useEffect, useState } from "react";

export interface AccentOption {
  id: string;
  name: string;
  hex: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "sky", name: "Azul cielo", hex: "#0284c7" },
  { id: "indigo", name: "Índigo", hex: "#4f46e5" },
  { id: "purple", name: "Púrpura", hex: "#7c3aed" },
  { id: "emerald", name: "Esmeralda", hex: "#10b981" },
  { id: "amber", name: "Ámbar", hex: "#f59e0b" },
  { id: "rose", name: "Rosa", hex: "#f43f5e" },
  { id: "neutral", name: "Neutro", hex: "#525252" },
];

const STORAGE_KEY = "accent_color";
const DEFAULT_ACCENT = "sky";

function applyAccent(id: string) {
  const match = ACCENT_OPTIONS.find((c) => c.id === id) ?? ACCENT_OPTIONS[0];
  document.documentElement.style.setProperty("--accent-color", match.hex);
  document.documentElement.setAttribute("data-accent", match.id);
}

if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
    applyAccent(stored);
  } catch {}
}

export function useAccentColor() {
  const [accent, setAccentState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
  });

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setAccent = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setAccentState(id);
    applyAccent(id);
  }, []);

  const currentOption =
    ACCENT_OPTIONS.find((c) => c.id === accent) ?? ACCENT_OPTIONS[0];

  return {
    accent,
    setAccent,
    currentOption,
    options: ACCENT_OPTIONS,
  };
}
