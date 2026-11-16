import type { TaskFieldView } from "../types";

export default function TaskDueDateCell({ view }: { view: TaskFieldView }) {
  const { task, onPatch } = view;

  return (
    <td className="h-12 px-1.5">
      <input
        type="date"
        value={task.due_date ?? ""}
        onChange={(event) => {
          void onPatch(task, {
            due_date: event.target.value || null,
            expected_calendar_revision: String(task.calendar_revision || 1),
            calendar_intent_id: crypto.randomUUID(),
          }).catch(() => {});
        }}
        className="cursor-pointer rounded-lg px-2 py-1 text-xs text-neutral-800 hover:bg-neutral-100 focus:outline-none dark:text-neutral-100 dark:[color-scheme:dark] dark:hover:bg-neutral-800"
      />
    </td>
  );
}
