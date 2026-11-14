import Button from "../../shared/components/Button/Button";
import XIcon from "../../shared/icons/XIcon";
import Select from "../../shared/components/Select/Select";
import SettingsSection from "./SettingsSection";
import type { SettingsController } from "./useSettings";

export default function SpecialtiesSettings({
  settings,
}: {
  settings: SettingsController;
}) {
  return (
    <SettingsSection
      title="Mis especialidades"
      description="Añade las especialidades y competencias que dominas para la asignación de proyectos."
    >
      {settings.loading ? null : settings.error ? (
        <p
          role="alert"
          className="m-0 text-xs text-neutral-600 dark:text-neutral-400"
        >
          No se pudieron cargar tus especialidades.
        </p>
      ) : (
        <div className="grid gap-3">
          {settings.specialties.length === 0 ? (
            <p className="m-0 text-xs text-neutral-600 dark:text-neutral-400">
              Aún no tienes especialidades registradas.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {settings.specialties.map((specialty) => (
                <li
                  key={specialty.id}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-xs  text-white"
                >
                  {specialty.name}
                  <button
                    type="button"
                    disabled={settings.saving}
                    onClick={() => void settings.removeSpecialty(specialty)}
                    aria-label={`Quitar ${specialty.name}`}
                    className="inline-flex cursor-pointer items-center rounded-full p-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                style="small"
                value={settings.selectedSpecialty}
                onChange={(event) =>
                  settings.setSelectedSpecialty(event.target.value)
                }
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
