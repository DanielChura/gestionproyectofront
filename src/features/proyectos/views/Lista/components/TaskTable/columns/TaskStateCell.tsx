import { useEffect, useRef, useState } from "react";
import StateIcon from "../../../../../shared/task-status/StateIcon";
import type { TaskFieldView } from "../types";

export default function TaskStateCell({ view }: { view: TaskFieldView }) {
  const { task, project, onState } = view;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const states = project.task_states.states;

  return (
    <td className="h-12 px-1.5">
      <div ref={container} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-100"
          style={{ backgroundColor: task.state_color ?? "#737373" }}
        >
          <StateIcon
            code={task.state_code}
            name={task.state_name}
            category={task.state_category}
            color="#fff"
          />
          <span className="truncate">{task.state_name}</span>
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {states.map((state) => (
              <button
                key={state.code}
                type="button"
                onClick={() => {
                  void onState(task, { state_code: state.code });
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                  task.state_code === state.code
                    ? "bg-neutral-50 font-medium text-neutral-900 dark:bg-neutral-700/50 dark:text-neutral-100"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <StateIcon
                  code={state.code}
                  name={state.name}
                  category={state.category}
                  color={state.color}
                />
                <span className="truncate">{state.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
