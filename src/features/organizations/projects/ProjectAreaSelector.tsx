import type { Area } from "../../../core/interfaces/organization.interface";

interface ProjectAreaSelectorProps {
  areas: Area[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}

export default function ProjectAreaSelector({
  areas,
  selectedIds,
  onToggle,
}: ProjectAreaSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-neutral-800 dark:text-neutral-100">
        Áreas operativas participantes
      </label>
      <div className="flex flex-wrap gap-1.5">
        {areas.map((a) => {
          const selected = selectedIds.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onToggle(a.id)}
              className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-medium border ${
                selected
                  ? "border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900"
                  : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {a.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

