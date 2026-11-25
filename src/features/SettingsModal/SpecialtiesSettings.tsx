import Button from "../../shared/components/Button/Button";
import Select from "../../shared/components/Select/Select";
import XIcon from "../../shared/icons/XIcon";
import type { SettingsController } from "./useSettings";

interface SpecialtiesSettingsProps {
  settings: SettingsController;
}

export default function SpecialtiesSettings({ settings }: SpecialtiesSettingsProps) {
  return (
    <section className="py-5">
      <h3 className="m-0 text-sm text-neutral-900 dark:text-neutral-100">
        Habilidades
      </h3>
      <p className="m-0 mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Gestiona las especialidades y competencias para asignación de proyectos.
      </p>
      <div className="mt-4">
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
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                  >
                    <span>
                      {item.name} ·{" "}
                      {item.level === 1
                        ? "Básico"
                        : item.level === 2
                          ? "Intermedio"
                          : "Avanzado"}
                    </span>
                    <button
                      type="button"
                      disabled={settings.saving}
                      onClick={() => void settings.removeSpecialty(item)}
                      aria-label={`Quitar ${item.name}`}
                      className="inline-flex items-center rounded-full p-0.5 hover:bg-sky-100 dark:hover:bg-sky-900/60 disabled:cursor-not-allowed"
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
              <div className="w-full sm:w-40">
                <Select
                  value={settings.selectedLevel}
                  onChange={(e) => settings.setSelectedLevel(e.target.value)}
                  disabled={settings.saving}
                  aria-label="Nivel"
                >
                  <option value="1">Básico</option>
                  <option value="2">Intermedio</option>
                  <option value="3">Avanzado</option>
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
      </div>
    </section>
  );
}
