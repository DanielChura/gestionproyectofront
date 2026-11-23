import SettingsSection from "./SettingsSection";
import ThemeSelector from "./ThemeSelector";
import AccentColorPicker from "./AccentColorPicker";
import type { SettingsController } from "./useSettings";

interface AppearanceSectionProps {
  settings: SettingsController;
}

export default function AppearanceSection({
  settings,
}: AppearanceSectionProps) {
  return (
    <SettingsSection
      title="Apariencia"
      description="Personaliza el tema visual y los colores de la interfaz."
    >
      <div className="grid gap-6">
        <ThemeSelector theme={settings.theme} onChange={settings.setTheme} />
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-5">
          <AccentColorPicker
            currentAccent={settings.accent}
            options={settings.accentOptions}
            onChange={settings.setAccent}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
