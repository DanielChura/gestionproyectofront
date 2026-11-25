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
      <h3 className="m-0 text-sm text-neutral-900 dark:text-neutral-100">
        Perfil
      </h3>
      <div className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="m-0 text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Foto de perfil
            </p>
            <p className="m-0 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              PNG, JPEG o WebP, hasta 10 MB
            </p>
          </div>
          <Avatar
            name={settings.currentName}
            className="size-10 select-none rounded-full text-xs"
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Nombre
          </span>
          <Input
            className="max-w-[220px]"
            autoComplete="given-name"
            maxLength={100}
            required
            value={settings.firstName}
            onChange={(e) => settings.updateFirstName(e.target.value)}
            onBlur={() => void settings.saveFirstName()}
            onKeyDown={enterBlur}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Apellidos
          </span>
          <Input
            className="max-w-[220px]"
            autoComplete="family-name"
            maxLength={120}
            value={settings.lastName}
            onChange={(e) => settings.updateLastName(e.target.value)}
            onBlur={() => void settings.saveLastName()}
            onKeyDown={enterBlur}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Correo electrónico
          </span>
          <Input
            className="max-w-[220px]"
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

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            ID de la organización
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            aria-label={copied ? "Copiado" : "Copiar ID"}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <IdIcon className="size-4" />
            {copied ? "Copiado" : settings.profile?.id ?? "—"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Horas por semana
          </span>
          <Input
            className="max-w-[220px]"
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

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
            Contraseña
          </span>
          <Input
            className="max-w-[220px]"
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
    </section>
  );
}
