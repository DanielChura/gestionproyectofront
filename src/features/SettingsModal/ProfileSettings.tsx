import { useState } from "react";
import Avatar from "../../shared/Avatar";
import Input from "../../shared/components/Input/Input";
import IdIcon from "../../shared/icons/IdIcon";
import type { SettingsController } from "./useSettings";

interface ProfileSettingsProps {
  settings: SettingsController;
}

export default function ProfileSettings({ settings }: ProfileSettingsProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyId() {
    if (settings.profile?.id == null) return;
    navigator.clipboard?.writeText(String(settings.profile.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const enterBlur = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  return (
    <section className="py-5">
      <h3 className="m-0 mb-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
        Información del perfil
      </h3>

      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Fotografía de perfil
          </span>
          <div className="w-64 shrink-0 flex items-center">
            <Avatar
              name={settings.currentName}
              className="size-9 select-none rounded-full text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Nombre completo
          </span>
          <div className="w-64 shrink-0">
            <Input
              autoComplete="given-name"
              maxLength={100}
              required
              value={settings.firstName}
              onChange={(e) => settings.updateFirstName(e.target.value)}
              onBlur={() => void settings.saveFirstName()}
              onKeyDown={enterBlur}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Apellidos completos
          </span>
          <div className="w-64 shrink-0">
            <Input
              autoComplete="family-name"
              maxLength={120}
              value={settings.lastName}
              onChange={(e) => settings.updateLastName(e.target.value)}
              onBlur={() => void settings.saveLastName()}
              onKeyDown={enterBlur}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Dirección de correo electrónico
          </span>
          <div className="w-64 shrink-0">
            <Input
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={settings.email}
              onChange={(e) => settings.updateEmail(e.target.value)}
              onBlur={() => void settings.saveEmail()}
              onKeyDown={enterBlur}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Identificador de usuario
          </span>
          <div className="w-64 shrink-0 flex items-center">
            <button
              type="button"
              onClick={handleCopyId}
              aria-label={copied ? "Copiado" : "Copiar ID"}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <IdIcon className="size-4" />
              <span>{copied ? "Copiado" : settings.profile?.id ?? "—"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Jornada laboral semanal
          </span>
          <div className="w-64 shrink-0">
            <Input
              type="number"
              min="0.01"
              max="168"
              step="0.5"
              value={settings.weeklyHours}
              onChange={(e) => settings.updateWeeklyHours(e.target.value)}
              onBlur={() => void settings.saveWeeklyHours()}
              onKeyDown={enterBlur}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 py-3">
          <span className="min-w-0 flex-1 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Contraseña de acceso
          </span>
          <div className="w-64 shrink-0">
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Nueva contraseña"
              value={settings.password}
              onChange={(e) => settings.setPassword(e.target.value)}
              onBlur={() => void settings.savePassword()}
              onKeyDown={enterBlur}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
