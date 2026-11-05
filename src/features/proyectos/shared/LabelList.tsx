import type { Label } from "../../../core/interfaces/task.interface";

interface LabelListProps {
  labels: (Label & { id?: number })[];
  onRemove?: (index: number) => void;
}

export default function LabelList({ labels, onRemove }: LabelListProps) {
  if (labels.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5 p-0 my-2 list-none">
      {labels.map((label, index) => (
        <li
          key={label.id ?? `${label.kind}:${label.name}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          <span>{label.name}</span>
          {onRemove && (
            <button
              type="button"
              aria-label={`Retirar ${label.name}`}
              onClick={() => onRemove(index)}
              className="flex size-4 items-center justify-center rounded-full text-xs text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 cursor-pointer"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

