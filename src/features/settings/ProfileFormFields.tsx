import Input from "../../shared/components/Input/Input";
import type { SettingsController } from "./useSettings";
import { GMAIL_PATTERN, GMAIL_TITLE } from "../../utils/gmail";

interface ProfileFormFieldsProps {
  settings: SettingsController;
}

export default function ProfileFormFields({ settings }: ProfileFormFieldsProps) {
  return (
    <>
      <div className="grid gap-1">
        <label htmlFor="settings-first-name" className="text-xs text-neutral-600 dark:text-neutral-400">
          Nombre
        </label>
        <Input
          id="settings-first-name"
          autoComplete="given-name"
          maxLength={100}
          required
          value={settings.firstName}
          onChange={(e) => settings.updateFirstName(e.target.value)}
        />
      </div>

      <div className="grid gap-1">
        <label htmlFor="settings-last-name" className="text-xs text-neutral-600 dark:text-neutral-400">
          Apellidos
        </label>
        <Input
          id="settings-last-name"
          autoComplete="family-name"
          maxLength={120}
          value={settings.lastName}
          onChange={(e) => settings.updateLastName(e.target.value)}
        />
      </div>

      <div className="grid gap-1 sm:col-span-2">
        <label htmlFor="settings-email" className="text-xs text-neutral-600 dark:text-neutral-400">
          Correo electrónico
        </label>
        <Input
          id="settings-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          pattern={GMAIL_PATTERN}
          title={GMAIL_TITLE}
          value={settings.email}
          onChange={(e) => settings.updateEmail(e.target.value)}
        />
      </div>

      <div className="grid gap-1 sm:col-span-2">
        <label htmlFor="settings-password" className="text-xs text-neutral-600 dark:text-neutral-400">
          Contraseña
        </label>
        <Input
          id="settings-password"
          type="password"
          autoComplete="new-password"
          placeholder="Nueva contraseña (opcional)"
          value={settings.password}
          onChange={(e) => settings.setPassword(e.target.value)}
        />
      </div>
    </>
  );
}
