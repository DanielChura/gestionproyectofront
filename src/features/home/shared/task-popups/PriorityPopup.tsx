import type { EditTaskPayload, ProjectCatalogs, Task } from "../../types";
import FlagIcon from "../../../../shared/icons/FlagIcon";
import PriorityOptions from "../task-fields/PriorityOptions";
import { priorityTones } from "../../../../shared/priorityTones";
import { usePopup } from "./usePopup";

export default function PriorityPopup({
  catalogs,
  task,
  onPatch,
}: {
  catalogs: ProjectCatalogs;
  task: Task;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
}) {
  const { panel, trigger, open, setOpen } = usePopup();
  const priority = catalogs.priorities.find(
    (item) => item.code === task.priority,
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title="Prioridad"
        disabled={!task.permissions.edit}
        onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <FlagIcon
          className={`size-4 shrink-0 ${priorityTones[task.priority ?? 0]?.text ?? "text-neutral-400 dark:text-neutral-500"}`}
          fill
        />
        <span className="truncate text-neutral-700 dark:text-neutral-200">
          {priority ? priority.name : "Sin prioridad"}
        </span>
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed z-50 w-72 max-w-full overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <PriorityOptions
            priorities={catalogs.priorities}
            value={task.priority}
            onChange={(value) => {
              void onPatch(task, { priority: value }).catch(() => {});
              setOpen(false);
            }}
          />
        </div>
      )}
    </>
  );
}
