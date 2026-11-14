import type { EditTaskPayload, Project, Task } from "../../types";
import CalendarIcon from "../../../../shared/icons/CalendarIcon";
import Calendar from "../task-fields/Calendar";
import TaskDateValue from "../task-fields/TaskDateValue";
import { usePopup } from "./usePopup";

export default function DueDatePopup({
  project,
  task,
  parent,
  onPatch,
}: {
  project: Project;
  task: Task;
  parent?: Task;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
}) {
  const { panel, trigger, open, setOpen } = usePopup();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title="Fecha límite"
        disabled={!task.permissions.edit}
        onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 p-1 text-xs hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <CalendarIcon className="size-4" />
        {task.due_date && <TaskDateValue value={task.due_date} short />}
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed z-50 w-72 max-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <Calendar
            label="Fecha límite"
            value={task.due_date ?? ""}
            min={
              task.start_date ||
              parent?.start_date ||
              project.start_date ||
              undefined
            }
            max={parent?.due_date ?? project.end_date ?? undefined}
            onChange={(value) => {
              void onPatch(task, { due_date: value || null }).catch(() => {});
              setOpen(false);
            }}
            close={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
