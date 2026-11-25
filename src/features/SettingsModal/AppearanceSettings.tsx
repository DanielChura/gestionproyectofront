import type { Theme } from "../../hooks/useTheme";
import type { AccentOption } from "../../hooks/useAccentColor";
import DarkThemeIcon from "../../shared/icons/DarkThemeIcon";
import LightThemeIcon from "../../shared/icons/LightThemeIcon";
import SystemThemeIcon from "../../shared/icons/SystemThemeIcon";
import CheckIcon from "../../shared/icons/CheckIcon";
import type { SettingsController } from "./useSettings";

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automática" },
];

interface AppearanceSettingsProps {
  settings: SettingsController;
}

export default function AppearanceSettings({ settings }: AppearanceSettingsProps) {
  const themeIcon = (theme: Theme) =>
    theme === "dark"
      ? DarkThemeIcon
      : theme === "light"
        ? LightThemeIcon
        : SystemThemeIcon;

  return (
    <section className="py-5">
      <h3 className="m-0 text-sm text-neutral-900 dark:text-neutral-100">
        General
      </h3>
      <p className="m-0 mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Personaliza el tema visual y los colores de la interfaz.
      </p>
      <div className="mt-4 grid gap-6">
        <div className="grid gap-2">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Tema
          </span>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => {
              const active = settings.theme === option.value;
              const Icon = themeIcon(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => settings.setTheme(option.value)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-1.5 text-left ${
                    active
                      ? "border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900 dark:border-neutral-100 dark:bg-neutral-800 dark:ring-neutral-100"
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                  }`}
                >
                  <Icon className="aspect-video w-full rounded-md" />
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-5">
          <div className="grid gap-2">
            <div>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                Color de acento
              </span>
              <p className="m-0 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                Personaliza los elementos interactivos y destacados de la interfaz.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {settings.accentOptions.map((color: AccentOption) => {
                const active = settings.accent === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => settings.setAccent(color.id)}
                    aria-label={color.name}
                    aria-pressed={active}
                    style={{ backgroundColor: color.hex }}
                    className={`flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ${
                      active
                        ? "ring-2 ring-neutral-900 dark:ring-neutral-100"
                        : "hover:opacity-90"
                    }`}
                  >
                    {active && <CheckIcon className="size-3.5 text-neutral-100" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
