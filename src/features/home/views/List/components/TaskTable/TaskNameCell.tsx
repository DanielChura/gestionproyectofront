import { themeColor } from "../../../../utils/themePresentation";
import ChevronDownIcon from "../../../../../../shared/icons/ChevronIcon";
import { getIcon } from "../../../../../../shared/icons/icon-catalog";
import { initialColor } from "../../../../../../utils/initialColor";
import type { TaskRowModel } from "./types";

export default function TaskNameCell({
  row,
  projectName,
  onToggle,
  onOpen,
}: {
  row: TaskRowModel;
  projectName: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { task, depth, context, open, searching, childCount, descendantCount } =
    row;
  const Icon = getIcon(task.state_tema?.icono);
  const relation = context
    ? "Contexto"
    : depth > 0 || task.parent_id !== null
      ? "Subtarea"
      : "";

  return (
    <td className="h-12 pr-3">
      <div
        className="flex h-full min-w-0 items-center gap-2.5"
        style={{ paddingInlineStart: `${Math.min(depth, 8) * 20}px` }}
      >
        {childCount > 0 ? (
          <button
            type="button"
            className="inline-flex size-5 shrink-0 items-center justify-center text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300"
            aria-label={`${open ? "Contraer" : "Expandir"} subtareas de ${task.name}`}
            aria-expanded={open}
            disabled={searching}
            onClick={onToggle}
          >
            <ChevronDownIcon
              fill
              className={open ? "size-4" : "size-4 -rotate-90"}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        <span
          style={{ color: themeColor(task.state_tema?.color) }}
          className="shrink-0 text-neutral-500 dark:text-neutral-400"
        >
          <Icon className="size-4" fill />
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-neutral-600 dark:text-neutral-400">
            {projectName}
            {relation && ` · ${relation}`}
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              className="truncate text-left text-sm font-medium text-neutral-800 dark:text-neutral-100"
              onClick={onOpen}
            >
              {task.name}
            </button>
            {childCount > 0 && (
              <span className="whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                {descendantCount}
              </span>
            )}
            {task.labels.slice(0, 2).map((label) => (
              <span
                key={label.id}
                className={`max-w-20 truncate rounded-full px-1.5 py-0.5 text-[11px] lowercase text-neutral-100 ${initialColor(label.name)}/50`}
              >
                {label.name}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="whitespace-nowrap text-[11px] text-neutral-500 dark:text-neutral-400">
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
    </td>
  );
}
