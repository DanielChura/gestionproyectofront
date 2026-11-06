import FlagIcon from "../../../../shared/Icons/FlagIcon";
import SuccessIcon from "../../../../shared/Icons/SuccessIcon";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";
import { priorityTones } from "./priorityTones";

export default function PriorityOptions({
  priorities,
  value,
  onChange,
}: {
  priorities: ProjectCatalogs["priorities"];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div role="group" aria-label="Prioridad" className="grid gap-1">
      {[{ code: null, name: "Sin prioridad" }, ...priorities].map((item) => (
        <button
          key={String(item.code)}
          type="button"
          aria-pressed={value === item.code}
          onClick={() => onChange(item.code)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs text-neutral-800 hover:bg-neutral-100 aria-pressed:bg-neutral-100 aria-pressed:font-semibold dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:aria-pressed:bg-neutral-800"
        >
          <FlagIcon
            className={`size-4 shrink-0 ${priorityTones[item.code ?? 0]?.text ?? "text-neutral-400"}`}
            fill
          />
          <span className="flex-1">{item.name}</span>
          {value === item.code && <SuccessIcon className="size-4 shrink-0" />}
        </button>
      ))}
    </div>
  );
}
