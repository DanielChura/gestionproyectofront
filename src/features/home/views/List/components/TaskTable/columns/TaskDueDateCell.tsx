import CalendarIcon from "../../../../../../../shared/icons/CalendarIcon";
import { formatTaskDate } from "../../../../../utils/taskHierarchy";
import type { TaskFieldView } from "../types";

export default function TaskDueDateCell({ view }: { view: TaskFieldView }) {
  const { task, onPatch } = view;

  return (
    <td className="h-12 p-1">
      <div className="group relative flex h-full w-full items-center">
        <div className="flex h-full w-full items-center gap-1.5 rounded-md border border-transparent px-2 text-xs text-neutral-700 group-hover:border-neutral-300 dark:text-neutral-300 dark:group-hover:border-neutral-700">
          <CalendarIcon
            className="size-4 shrink-0 text-neutral-400"
            fill={false}
          />
          {task.due_date && (
            <span className="truncate">{formatTaskDate(task.due_date)}</span>
          )}
        </div>
        <input
          type="date"
          value={task.due_date ?? ""}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {}
          }}
          onChange={(event) => {
            void onPatch(task, {
              due_date: event.target.value || null,
              expected_calendar_revision: String(task.calendar_revision || 1),
              calendar_intent_id: crypto.randomUUID(),
            }).catch(() => {});
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </td>
  );
}
