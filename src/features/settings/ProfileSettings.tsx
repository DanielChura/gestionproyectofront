import Avatar from "../../shared/Avatar";
import Button from "../../shared/components/Button/Button";
import Input from "../../shared/components/Input/Input";

import SettingsSection from "./SettingsSection";
import type { SettingsController } from "./useSettings";

export default function ProfileSettings({
  settings,
}: {
  settings: SettingsController;
}) {
  return (
    <SettingsSection
      title="Perfil"
      description="Tu información personal y los ajustes de seguridad de tu cuenta."
    >
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={settings.saveProfile}
      >
        <div className="flex items-center gap-3 sm:col-span-2">
          {settings.profile && (
            <Avatar
              name={settings.currentName}
              className="size-12 select-none rounded-full text-base ring-2 ring-neutral-300 dark:ring-neutral-700"
            />
          )}
          <p className="m-0 text-xs text-neutral-700 dark:text-neutral-300">
            {settings.currentName}
          </p>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="settings-first-name"
            className="text-xs text-neutral-700 dark:text-neutral-300"
          >
            Nombre
          </label>
          <Input
            id="settings-first-name"
            style="small"
            autoComplete="given-name"
            maxLength={100}
            required
            value={settings.firstName}
            onChange={(event) => settings.updateFirstName(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="settings-last-name"
            className="text-xs text-neutral-700 dark:text-neutral-300"
          >
            Apellidos
          </label>
          <Input
            id="settings-last-name"
            style="small"
            autoComplete="family-name"
            maxLength={120}
            value={settings.lastName}
            onChange={(event) => settings.updateLastName(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <label
            htmlFor="settings-email"
            className="text-xs text-neutral-700 dark:text-neutral-300"
          >
            Correo electrónico
          </label>
          <Input
            id="settings-email"
            style="small"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={settings.email}
            onChange={(event) => settings.updateEmail(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <label
            htmlFor="settings-password"
            className="text-xs text-neutral-700 dark:text-neutral-300"
          >
            Contraseña
          </label>
          <Input
            id="settings-password"
            style="small"
            type="password"
            autoComplete="new-password"
            placeholder="Introduce una nueva contraseña"
            value={settings.password}
            onChange={(event) => settings.setPassword(event.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={settings.savingProfile}>
            {settings.savingProfile ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
