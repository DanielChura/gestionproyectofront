import { useEffect, useRef, useState } from "react";
import type { TaskFieldView } from "../types";
import { themeColor, themeIcon } from "../../../../../utils/themePresentation";
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
    <td className="h-12 px-1.5">
      <div ref={container} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          style={{
            backgroundColor: tone ?? "#525252",
            color: "#fff",
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs "
        >
          <Icon className="size-4" />
          <span className="truncate">{task.state_name}</span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-40 rounded-lg border border-neutral-200 bg-neutral-100 p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {states.map((state) => {
              const isSelected = task.state_code === state.code;

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
                      ? "bg-neutral-100  text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <Icon className="size-4" />
                  <span
                    style={{
                      backgroundColor:
                        themeColor(state.tema?.color) ?? "transparent",
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
