import { useEffect, useRef, useState } from "react";
import type { TaskFieldView } from "../types";
import { themeColor } from "../../../../../utils/themePresentation";
import { getIcon } from "../../../../../../../shared/icons/icon-catalog";

export default function TaskStateCell({ view }: { view: TaskFieldView }) {
  const { task, project, onState } = view;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const states = project.task_states.states;
  const tone = themeColor(task.state_tema?.color);
  const Icon = getIcon(task.state_tema?.icono);

  return (
    <td className="h-12 p-1">
      <div ref={container} className="relative h-full w-full">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-full w-full items-center gap-1.5 rounded-md border border-transparent px-2 text-xs hover:border-neutral-300 dark:hover:border-neutral-700"
        >
          <span
            style={{
              backgroundColor: tone ?? "#525252",
              color: "#fff",
            }}
            className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium"
          >
            <Icon className="size-3.5" fill />
            <span className="truncate">{task.state_name}</span>
          </span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {states.map((state) => {
              const isSelected = task.state_code === state.code;
              const stateTone = themeColor(state.tema?.color);
              const StateItemIcon = getIcon(state.tema?.icono);

              return (
                <button
                  key={state.code}
                  type="button"
                  onClick={() => {
                    void onState(task, { state_code: state.code });
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                    isSelected
                      ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <StateItemIcon className="size-4" fill />
                  <span
                    style={{
                      backgroundColor: stateTone ?? "transparent",
                    }}
                    className="h-2 w-2 rounded-full"
                  />
                  <span className="truncate">{state.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </td>
  );
}
