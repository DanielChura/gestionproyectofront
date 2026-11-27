import Button from "../../shared/components/Button/Button";
import Select from "../../shared/components/Select/Select";
import XIcon from "../../shared/icons/XIcon";
import type { SettingsController } from "./useSettings";

interface SpecialtiesSettingsProps {
  settings: SettingsController;
}

export default function SpecialtiesSettings({
  settings,
}: SpecialtiesSettingsProps) {
  return (
    <section className="py-5">
      <h3 className="m-0 mb-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
        Especialidades y competencias
      </h3>

      <div className="grid gap-4">
        {settings.specialties.length === 0 ? (
          <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
            No cuentas con especialidades vinculadas actualmente.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {settings.specialties.map((item) => (
              <li
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
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
                  className="inline-flex items-center rounded-full p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200 disabled:cursor-not-allowed"
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
              aria-label="Especialidad técnica"
            >
              <option value="">Seleccionar especialidad...</option>
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
              aria-label="Nivel de experiencia"
            >
              <option value="1">Nivel básico</option>
              <option value="2">Nivel intermedio</option>
              <option value="3">Nivel avanzado</option>
            </Select>
          </div>
          <Button
            type="button"
            disabled={!settings.selectedSpecialty || settings.saving}
            onClick={() => void settings.addSpecialty()}
          >
            {settings.saving ? "Guardando…" : "Añadir"}
          </Button>
        </div>
      </div>
    </section>
  );
}
