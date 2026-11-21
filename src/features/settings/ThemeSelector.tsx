import type { Theme } from "../../hooks/useTheme";
import ThemePreview from "./ThemePreview";

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automática" },
];

interface ThemeSelectorProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export default function ThemeSelector({
  theme,
  onChange,
}: ThemeSelectorProps) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
        Tema
      </span>
      <div className="grid grid-cols-3 gap-3">
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-2 rounded-lg border p-1.5 text-left ${
                active
                  ? "border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900 dark:border-neutral-100 dark:bg-neutral-800 dark:ring-neutral-100"
                  : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              }`}
            >
              <ThemePreview
                theme={option.value}
                className="aspect-video w-full rounded-md"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
