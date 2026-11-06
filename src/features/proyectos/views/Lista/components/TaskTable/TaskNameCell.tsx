import ChevronDownIcon from "../../../../../../shared/Icons/ChevronIcon";
import { getIcon } from "../../../../../../shared/Icons/icon-catalog";
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
  const color = task.state_tema?.color ?? "#525252";

  return (
    <td className="h-12 px-3">
      <div
        className="flex h-full min-w-0 items-center gap-2.5"
        style={{ paddingInlineStart: `${Math.min(depth, 8) * 20}px` }}
      >
        {childCount > 0 ? (
          <button
            className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
            type="button"
            aria-label={`${open ? "Contraer" : "Expandir"} subtareas de ${task.name}`}
            aria-expanded={open}
            disabled={searching}
            onClick={onToggle}
          >
            <ChevronDownIcon
              fill={true}
              className={`size-4 ${open ? "" : "-rotate-90"}`}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <span style={{ color }} className="shrink-0" title={task.state_name}>
          <Icon className="size-4" fill />
        </span>

        <div className={`min-w-0 flex-1 ${depth ? "pl-2" : ""}`}>
          <span
            className="block truncate text-xs leading-4 text-neutral-600 dark:text-neutral-400"
            title={projectName}
          >
            {projectName}
            {context
              ? " · Padre de contexto"
              : depth > 0
                ? " · Subtarea"
                : task.parent_id !== null
                  ? " · Subtarea asignada"
                  : ""}
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              data-task-drag-surface
              className="cursor-pointer truncate text-left text-sm text-neutral-800 dark:text-neutral-100"
              title={task.name}
              onClick={onOpen}
            >
              {task.name}
            </button>

            {childCount > 0 && (
              <span
                className="whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400"
                title="Subtareas visibles"
              >
                {descendantCount}
              </span>
            )}
            {task.labels.slice(0, 2).map((label) => (
              <span
                key={label.id}
                className="max-w-20 truncate rounded px-1.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-400"
                title={label.name}
              >
                {label.name}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
    </td>
  );
}
