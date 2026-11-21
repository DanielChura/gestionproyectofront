import Avatar from "../../shared/Avatar";
import Button from "../../shared/components/Button/Button";
import SettingsSection from "./SettingsSection";
import ProfileFormFields from "./ProfileFormFields";
import ProfileFormSkeleton from "./ProfileFormSkeleton";
import type { SettingsController } from "./useSettings";

interface ProfileSectionProps {
  settings: SettingsController;
}

export default function ProfileSection({ settings }: ProfileSectionProps) {
  return (
    <SettingsSection
      title="Perfil"
      description="Tu información personal y los ajustes de tu cuenta."
    >
      {settings.profileLoading ? (
        <ProfileFormSkeleton />
      ) : (
        <form onSubmit={settings.saveProfile} className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2">
            {settings.profile && (
              <Avatar
                name={settings.currentName}
                className="size-11 select-none rounded-full text-xs ring-1 ring-neutral-300 dark:ring-neutral-700"
              />
            )}
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {settings.currentName}
            </span>
          </div>

          <ProfileFormFields settings={settings} />

          <div className="pt-1 sm:col-span-2">
            <Button type="submit" disabled={settings.savingProfile}>
              {settings.savingProfile ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}
