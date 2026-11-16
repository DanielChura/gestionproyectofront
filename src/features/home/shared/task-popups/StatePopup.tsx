import { themeColor } from "../../utils/themePresentation";
import type { TaskStatePayload } from "../../types";
import type { Project, Task } from "../../types";
import { DynamicIcon } from "../../../../shared/icons/icon-catalog";
import { usePopup } from "./usePopup";

export default function StatePopup({
  project,
  task,
  onState,
}: {
  project: Project;
  task: Task;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}) {
  const { panel, trigger, open, setOpen } = usePopup();
  const state = project.task_states.states.find(
    (item) => item.code === task.state_code,
  );
  const color =
    state?.tema?.color ?? task.state_tema?.color ?? task.state_color;

  async function handleChange(target: string) {
    try {
      await onState(task, { state_code: target });
      setOpen(false);
    } catch {
      // keep popup open so the user can retry
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title="Estado"
        disabled={!task.permissions.state || task.transitions.length === 0}
        onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 p-1 text-xs hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        <span
          className="inline-flex shrink-0"
          style={color ? { color: themeColor(color) } : undefined}
        >
          <DynamicIcon name={state?.tema?.icono ?? task.state_tema?.icono} className="size-4" fill />
        </span>
        {state && <span className="truncate">{state.name}</span>}
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed z-50 w-72 max-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
        >
          {task.transitions.length === 0 ? (
            <p className="m-0 p-2 text-neutral-500">
              No hay transiciones autorizadas desde el estado actual.
            </p>
          ) : (
            <div className="grid gap-1">
              {task.transitions.map((transition) => {
                const targetState = project.task_states.states.find(
                  (item) => item.code === transition.target,
                );
                const targetColor =
                  targetState?.tema?.color ?? targetState?.color;
                return (
                  <button
                    key={transition.target}
                    type="button"
                    onClick={() => void handleChange(transition.target)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span
                      className="inline-flex shrink-0"
                      style={targetColor ? { color: themeColor(targetColor) } : undefined}
                    >
                      <DynamicIcon name={targetState?.tema?.icono} className="size-4" fill />
                    </span>
                    <span className="truncate">
                      {targetState?.name ?? transition.target}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
