import Button from "../../shared/components/Button/Button";
import XIcon from "../../shared/icons/XIcon";
import Select from "../../shared/components/Select/Select";
import SettingsSection from "./SettingsSection";
import SpecialtiesSkeleton from "./SpecialtiesSkeleton";
import type { SettingsController } from "./useSettings";

interface SpecialtiesSectionProps {
  settings: SettingsController;
}

export default function SpecialtiesSection({
  settings,
}: SpecialtiesSectionProps) {
  return (
    <SettingsSection
      title="Mis especialidades"
      description="Gestiona las especialidades y competencias para asignación de proyectos."
    >
      {settings.loading ? (
        <SpecialtiesSkeleton />
      ) : (
        <div className="grid gap-4">
          {settings.specialties.length === 0 ? (
            <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
              Aún no tienes especialidades registradas.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {settings.specialties.map((item) => (
                <li
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-xs text-neutral-100"
                >
                  <span>{item.name}</span>
                  <button
                    type="button"
                    disabled={settings.saving}
                    onClick={() => void settings.removeSpecialty(item)}
                    aria-label={`Quitar ${item.name}`}
                    className="inline-flex items-center rounded-full p-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Select
                value={settings.selectedSpecialty}
                onChange={(e) => settings.setSelectedSpecialty(e.target.value)}
                disabled={settings.saving || settings.catalog.length === 0}
                aria-label="Especialidad"
              >
                <option value="">Selecciona una especialidad</option>
                {settings.catalog.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              disabled={!settings.selectedSpecialty || settings.saving}
              onClick={() => void settings.addSpecialty()}
            >
              {settings.saving ? "Guardando…" : "Agregar"}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
