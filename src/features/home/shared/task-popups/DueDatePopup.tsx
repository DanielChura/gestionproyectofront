import type { Project, Task, TaskPatchPayload } from "../../types";
import CalendarIcon from "../../../../shared/icons/CalendarIcon";
import Calendar from "../task-fields/Calendar";
import TaskDateValue from "../task-fields/TaskDateValue";
import { usePopup } from "./usePopup";

export default function DueDatePopup({
  project,
  task,
  parent,
  onPatch,
  field = "due_date",
  showLabel = false,
}: {
  project: Project;
  task: Task;
  parent?: Task;
  onPatch: (task: Task, data: TaskPatchPayload) => Promise<void>;
  field?: "due_date" | "start_date";
  showLabel?: boolean;
}) {
  const { panel, trigger, open, setOpen } = usePopup();
  const isStart = field === "start_date";
  const title = isStart ? "Fecha de inicio" : "Fecha límite";
  const dateValue = isStart ? task.start_date : task.due_date;

  const min = isStart
    ? (parent?.start_date || project.start_date || undefined)
    : (task.start_date || parent?.start_date || project.start_date || undefined);

  const max = isStart
    ? (task.due_date ?? parent?.due_date ?? project.end_date ?? undefined)
    : (parent?.due_date ?? project.end_date ?? undefined);

  function handleChange(value: string) {
    void onPatch(task, {
      [field]: value || null,
      expected_calendar_revision: String(task.calendar_revision || 1),
      calendar_intent_id: crypto.randomUUID(),
    }).catch(() => {});
    setOpen(false);
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title={title}
        disabled={!task.permissions.edit}
        onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <CalendarIcon className="size-4 text-neutral-400" />
        {dateValue ? (
          <TaskDateValue value={dateValue} short />
        ) : showLabel ? (
          <span className="text-neutral-500 dark:text-neutral-400">
            {isStart ? "Sin inicio" : "Sin límite"}
          </span>
        ) : null}
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed z-50 w-72 max-w-full overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <Calendar
            label={title}
            value={dateValue ?? ""}
            min={min}
            max={max}
            onChange={handleChange}
            close={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
