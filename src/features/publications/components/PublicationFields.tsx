import type { PublicationDraft } from "../utils/publication";
import Input from "../../../shared/components/Input/Input";

interface PublicationFieldsProps {
  draft: PublicationDraft;
  closingMin?: string;
  onField: <K extends keyof PublicationDraft>(
    field: K,
    value: PublicationDraft[K],
  ) => void;
}

export default function PublicationFields({
  draft,
  closingMin,
  onField,
}: PublicationFieldsProps) {
  return (
    <>
      <label className="col-span-1 grid gap-1.5">
        <span className="text-xs text-neutral-800 dark:text-neutral-100">
          Título
        </span>
        <Input
          name="title"
          type="text"
          maxLength={180}
          value={draft.title}
          placeholder="Título"
          onChange={(event) => onField("title", event.target.value)}
        />
      </label>
      <label className="col-span-1 grid gap-1.5">
        <span className="text-xs text-neutral-800 dark:text-neutral-100">
          Vacantes
        </span>
        <Input
          name="vacancies"
          type="number"
          min={1}
          max={65535}
          value={draft.vacancies}
          onChange={(event) => onField("vacancies", event.target.value)}
        />
      </label>
      <label className="col-span-1 grid gap-1.5">
        <span className="text-xs text-neutral-800 dark:text-neutral-100">
          Horas semanales
        </span>
        <Input
          name="weeklyHours"
          type="number"
          min={0.01}
          max={168}
          step={0.01}
          value={draft.weeklyHours}
          onChange={(event) => onField("weeklyHours", event.target.value)}
        />
      </label>
      <label className="col-span-1 grid gap-1.5">
        <span className="text-xs text-neutral-800 dark:text-neutral-100">
          Fecha de apertura
        </span>
        <Input
          name="openingDate"
          type="date"
          value={draft.openingDate}
          onChange={(event) => onField("openingDate", event.target.value)}
        />
      </label>
      <label className="col-span-1 grid gap-1.5">
        <span className="text-xs text-neutral-800 dark:text-neutral-100">
          Fecha de cierre
        </span>
        <Input
          name="closingDate"
          type="date"
          min={closingMin}
          value={draft.closingDate}
          onChange={(event) => onField("closingDate", event.target.value)}
        />
      </label>
    </>
  );
}
