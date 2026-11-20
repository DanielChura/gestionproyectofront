import type { ProjectArea } from "../../../../core/interfaces/project.interface";
import CheckIcon from "../../../../shared/icons/CheckIcon";
export default function ProjectAreaOptions({
  items,
  selected,
  onChange,
  close,
  emptyMessage,
}: {
  items: ProjectArea[];
  selected: number[];
  onChange: (ids: number[]) => void;
  close: () => void;
  emptyMessage: string;
}) {
  return (
    <>
      <div role="group" aria-label="Áreas disponibles" className="grid gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected[0] === item.id}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left hover:bg-neutral-100 aria-pressed:bg-neutral-100 dark:hover:bg-neutral-800 dark:aria-pressed:bg-neutral-800"
            onClick={() => {
              if (selected[0] !== item.id) onChange([item.id]);
              close();
            }}
          >
            <span className="min-w-0 break-words">{item.name}</span>
            {selected[0] === item.id && (
              <CheckIcon className="size-4 shrink-0" />
            )}
          </button>
        ))}
        {!items.length && (
          <p role="status" className="text-neutral-600 dark:text-neutral-400">
            {emptyMessage}
          </p>
        )}
      </div>
      {!!selected.length && (
        <button
          type="button"
          className="cursor-pointer justify-self-end rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          onClick={() => {
            onChange([]);
            close();
          }}
        >
          Quitar selección
        </button>
      )}
    </>
  );
}
