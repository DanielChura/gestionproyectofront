import type { Theme } from "../../hooks/useTheme";
import SettingsSection from "./SettingsSection";
import ThemePreview from "./ThemePreview";
import type { SettingsController } from "./useSettings";

const appearanceOptions: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automática" },
];

export default function AppearanceSettings({
  settings,
}: {
  settings: SettingsController;
}) {
  return (
    <SettingsSection
      title="Apariencia"
      description="Elige el modo claro u oscuro, o cambia automáticamente según tu sistema."
    >
      <div className="flex flex-wrap items-start gap-4">
        {appearanceOptions.map((option) => {
          const active = settings.theme === option.value;
          return (
            <div key={option.value} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => settings.setTheme(option.value)}
                aria-pressed={active}
                className={`w-28 cursor-pointer overflow-hidden rounded-xl border p-1 text-left ${
                  active
                    ? "border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900 dark:border-white dark:bg-neutral-800 dark:ring-white"
                    : "border-neutral-300 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
                }`}
              >
                <ThemePreview
                  theme={option.value}
                  className="aspect-video w-full overflow-hidden rounded-md"
                />
              </button>
              <span className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
                {option.label}
              </span>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}
