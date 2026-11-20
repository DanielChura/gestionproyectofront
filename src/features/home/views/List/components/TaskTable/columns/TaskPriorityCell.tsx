import { useEffect, useRef, useState } from "react";
import FlagIcon from "../../../../../../../shared/icons/FlagIcon";
import type { TaskFieldView } from "../types";
import { priorityTones } from "../../../../../../../shared/priorityTones";

export default function TaskPriorityCell({ view }: { view: TaskFieldView }) {
  const { task, onPatch } = view;
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

  const tone = task.priority ? priorityTones[task.priority] : undefined;

  return (
    <td className="h-12 p-1">
      <div ref={container} className="relative h-full w-full">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-full w-full items-center gap-1.5 rounded-md border border-transparent px-2 text-xs text-neutral-700 hover:border-neutral-300 dark:text-neutral-300 dark:hover:border-neutral-700"
        >
          <FlagIcon
            className={`size-4 shrink-0 ${tone?.text ?? "text-neutral-400"}`}
            fill={false}
          />
          {tone && <span className="truncate">{tone.texto}</span>}
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 min-w-36 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            <button
              type="button"
              onClick={() => {
                void onPatch(task, { priority: null });
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              <FlagIcon className="size-4 text-neutral-400" fill={false} />
              <span>Sin prioridad</span>
            </button>
            {Object.entries(priorityTones).map(([codeStr, item]) => {
              const code = Number(codeStr);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    void onPatch(task, { priority: code });
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                    task.priority === code
                      ? "bg-neutral-50 text-neutral-900 dark:bg-neutral-700/50 dark:text-neutral-100"
                      : "text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <FlagIcon
                    className={`size-4 shrink-0 ${item.text}`}
                    fill={false}
                  />
                  <span>{item.texto}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </td>
  );
}
