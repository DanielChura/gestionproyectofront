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
  { value: "system", label: "Automático" },
];

interface AppearanceSettingsProps {
  settings: SettingsController;
}

export default function AppearanceSettings({
  settings,
}: AppearanceSettingsProps) {
  const themeIcon = (theme: Theme) =>
    theme === "dark"
      ? DarkThemeIcon
      : theme === "light"
        ? LightThemeIcon
        : SystemThemeIcon;

  return (
    <section className="py-5">
      <h3 className="m-0 mb-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
        Tema y apariencia
      </h3>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Modo de visualización
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
                  className={`flex flex-col items-center gap-2 rounded-lg border p-2 text-left ${
                    active
                      ? "border-neutral-800 bg-neutral-100 ring-1 ring-neutral-800 dark:border-neutral-200 dark:bg-neutral-800 dark:ring-neutral-200"
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

        <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
          <div className="grid gap-2">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Color de acento principal
            </span>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {settings.accentOptions.map((color: AccentOption) => {
                const active = settings.accent === color.id;
                const isDefault = color.id === "default";
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => settings.setAccent(color.id)}
                    aria-label={color.name}
                    aria-pressed={active}
                    style={isDefault ? undefined : { backgroundColor: color.hex }}
                    className={`flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ${
                      isDefault
                        ? "bg-neutral-900 border border-neutral-300 dark:bg-neutral-100 dark:border-neutral-700"
                        : "hover:opacity-90"
                    } ${
                      active
                        ? "ring-2 ring-neutral-800 dark:ring-neutral-200"
                        : ""
                    }`}
                  >
                    {active && (
                      <CheckIcon
                        className={`size-3.5 ${
                          isDefault
                            ? "text-neutral-100 dark:text-neutral-900"
                            : "text-neutral-100"
                        }`}
                      />
                    )}
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
