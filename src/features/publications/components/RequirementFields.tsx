import type { PublicationSpecialty } from "../../../core/interfaces/publication.interface";
import Button from "../../../shared/components/Button/Button";
import Select from "../../../shared/components/Select/Select";
import PlusIcon from "../../../shared/icons/PlusIcon";
import TrashIcon from "../../../shared/icons/TrashIcon";
import type { PublicationDraft } from "../utils/publication";
import { LEVEL_LABELS } from "../utils/publication";

interface RequirementFieldsProps {
  requirements: PublicationDraft["requirements"];
  specialties: PublicationSpecialty[];
  levels: number[];
  onChange: (
    index: number,
    changes: Partial<PublicationDraft["requirements"][number]>,
  ) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  canAdd: boolean;
}

export default function RequirementFields({
  requirements,
  specialties,
  levels,
  onChange,
  onAdd,
  onRemove,
  canAdd,
}: RequirementFieldsProps) {
  return (
    <fieldset className="col-span-2 grid gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <legend className="text-xs text-neutral-600 dark:text-neutral-400">
        Requisitos
      </legend>
      {requirements.map((requirement, index) => (
        <div
          key={requirement.specialty_id}
          className="grid gap-2 sm:grid-cols-[1fr_120px_auto]"
        >
          <Select
            aria-label="Especialidad"
            value={requirement.specialty_id || ""}
            onChange={(event) =>
              onChange(index, { specialty_id: Number(event.target.value) })
            }
          >
            <option value="">Especialidad</option>
            {specialties.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Nivel mínimo"
            value={requirement.minimum_level}
            onChange={(event) =>
              onChange(index, { minimum_level: Number(event.target.value) })
            }
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level] ?? `Nivel ${level}`}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label="Quitar requisito"
            className="rounded-md p-1.5 text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      ))}
      <Button
        variant="secondary"
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="w-fit"
      >
        <PlusIcon className="size-4" /> Agregar
      </Button>
    </fieldset>
  );
}
