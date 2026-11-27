import { useCallback, useEffect, useState } from "react";
import { ACCENT_OPTIONS } from "../shared/constants/accent";
export type { AccentOption } from "../shared/constants/accent";
export { ACCENT_OPTIONS };

const STORAGE_KEY = "accent_color";
const DEFAULT_ACCENT = "default";

function applyAccent(id: string) {
  const match =
    ACCENT_OPTIONS.find((c) => c.id === id) ?? ACCENT_OPTIONS[0];
  const root = document.documentElement;
  root.setAttribute("data-accent", match.id);
  root.style.setProperty("--accent-sidebar-bg-light", match.sidebarBg.light);
  root.style.setProperty("--accent-sidebar-bg-dark", match.sidebarBg.dark);

  if (match.id === "default" || !match.btnBg) {
    root.style.removeProperty("--accent-btn-bg");
    root.style.removeProperty("--accent-btn-hover");
    root.style.removeProperty("--accent-btn-text");
  } else {
    root.style.setProperty("--accent-btn-bg", match.btnBg);
    root.style.setProperty("--accent-btn-hover", match.btnHover ?? match.btnBg);
    root.style.setProperty("--accent-btn-text", "#f5f5f5");
  }
}

if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
    applyAccent(stored);
  } catch {}
}

export function useAccentColor() {
  const [accent, setAccentState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ACCENT_OPTIONS.some((c) => c.id === stored)) {
        return stored;
      }
    } catch {}
    return DEFAULT_ACCENT;
  });

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setAccent = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
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
