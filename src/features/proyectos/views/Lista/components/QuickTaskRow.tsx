import { useEffect, useId, useLayoutEffect, useRef } from "react";
import Tooltip from "../../../../../shared/Tooltip";
import { taskCreationStart } from "../../../shared/task-fields/taskDates";
import TaskOptionalProperties from "../../../shared/task-form/TaskOptionalProperties";
import type { Project, ProjectCatalogs, Task } from "../../../types";
import { useQuickTask } from "../hooks/useQuickTask";
import { useQuickTaskAlignment } from "../hooks/useQuickTaskAlignment";
import { StateLabel } from "./TaskTable/TaskStateValue";

export default function QuickTaskRow({
  project,
  catalogs,
  groupCode,
  onCreated,
  onClose,
  savingRef,
  onDetachedCreated,
  parent,
  onBusyChange,
  onCheckCreation,
}: {
  project: Project;
  catalogs: ProjectCatalogs;
  groupCode?: string;
  onCreated: (task: Task) => void;
  onClose: (returnFocus?: boolean) => void;
  savingRef?: { current: boolean };
  onDetachedCreated?: (task: Task) => void;
  parent?: Task;
  onBusyChange?: (value: boolean) => void;
  onCheckCreation?: () => void;
}) {
  const draft = useQuickTask(
    project,
    groupCode,
    onCreated,
    onDetachedCreated,
    parent,
  );
  const form = useRef<HTMLFormElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const pending = useRef(false);
  const composing = useRef(false);
  const insideEvents = useRef(new WeakSet<Event>());
  const id = useId();
  const alignmentState =
    project.task_states.states.find((state) => state.code === groupCode) ??
    draft.state;
  const differentState = Boolean(
    groupCode && draft.state && draft.state.code !== groupCode,
  );
  const stateHelp = `Se creará en ${draft.state?.name}. El grupo requiere datos adicionales para crear en su estado.`;
  useQuickTaskAlignment(form, probe);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        !pending.current &&
        !draft.uncertain &&
        !insideEvents.current.has(event) &&
        event.target instanceof Node &&
        !form.current?.contains(event.target)
      )
        onClose(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !event.isComposing &&
        !pending.current
      ) {
        event.preventDefault();
        onClose(true);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose, draft.uncertain]);
  const cancel = () => {
    if (!pending.current) onClose(true);
  };
  useLayoutEffect(() => {
    name.current?.focus();
  }, []);
  useLayoutEffect(() => {
    onBusyChange?.(draft.busy || draft.uncertain);
  }, [draft.busy, draft.uncertain, onBusyChange]);
  useLayoutEffect(() => {
    if (!draft.busy && (draft.error || Object.keys(draft.errors).length)) {
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
        ?.focus();
    }
  }, [draft.busy, draft.errors, draft.error]);
  return (
    <form
      ref={form}
      aria-label="Creación rápida de tarea"
      aria-busy={draft.busy}
      noValidate
      onPointerDownCapture={(event) =>
        insideEvents.current.add(event.nativeEvent)
      }
      onCompositionStartCapture={() => {
        composing.current = true;
      }}
      onCompositionEndCapture={() => {
        composing.current = false;
      }}
      onKeyDownCapture={(event) => {
        if (
          event.nativeEvent.isComposing ||
          composing.current ||
          event.keyCode === 229
        )
          event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        const panel = form.current?.querySelector<HTMLElement>(":popover-open");
        if (panel) {
          panel.hidePopover();
          document.getElementById(panel.dataset.returnFocus ?? "")?.focus();
        } else if (!draft.uncertain) cancel();
      }}
      className={
        parent
          ? "grid w-full min-w-0 grid-cols-1 p-2 text-xs text-neutral-800 dark:text-neutral-100"
          : "sticky left-0 grid w-full max-w-full py-2 pl-3 text-xs text-neutral-800 dark:text-neutral-100"
      }
      style={
        parent
          ? undefined
          : {
              gridTemplateColumns:
                "minmax(0, 1fr) var(--quick-task-end-space, 0.75rem)",
            }
      }
      onSubmit={(event) => {
        event.preventDefault();
        if (
          pending.current ||
          composing.current ||
          form.current?.querySelector(":popover-open")
        )
          return;
        pending.current = true;
        onBusyChange?.(true);
        if (savingRef) savingRef.current = true;
        void draft
          .save()
          .then((saved) => {
            if (saved) onClose(true);
          })
          .finally(() => {
            pending.current = false;
            onBusyChange?.(false);
            if (savingRef) savingRef.current = false;
          });
      }}
    >
      <fieldset
        disabled={draft.busy || draft.uncertain}
        className="col-start-1 row-start-1 m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
      >
        <div
          className={`min-w-0 grow basis-40 ${differentState ? "basis-full @xl:basis-40" : ""}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor={`${id}-name`} className="sr-only">
              Nombre de la tarea
            </label>
            <input
              ref={name}
              id={`${id}-name`}
              name="name"
              autoComplete="off"
              maxLength={180}
              placeholder="Nombre de la tarea…"
              value={draft.name}
              onChange={(event) => draft.setName(event.target.value)}
              aria-invalid={Boolean(draft.errors["task-name"])}
              aria-describedby={
                draft.errors["task-name"] ? `${id}-error` : undefined
              }
              className="w-0 min-w-0 flex-1 border-0 border-b-2 border-transparent bg-transparent px-1 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 focus-visible:border-neutral-700 focus-visible:outline-none! aria-invalid:border-red-700"
            />
            {differentState && draft.state && (
              <Tooltip label={stateHelp}>
                {(description) => (
                  <button
                    type="button"
                    aria-label={stateHelp}
                    aria-describedby={description}
                    className="inline-flex max-w-32 shrink-0 cursor-help items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="truncate">{draft.state!.name}</span>
                  </button>
                )}
              </Tooltip>
            )}
            {draft.errors["task-name"] && (
              <p
                id={`${id}-error`}
                className="mt-1 text-red-700 dark:text-red-400"
                role="alert"
              >
                {draft.errors["task-name"]}
              </p>
            )}
          </div>
        </div>
        <TaskOptionalProperties
          compact
          project={project}
          catalogs={catalogs}
          responsible={draft.responsible}
          dueDate={draft.dueDate}
          min={taskCreationStart(project.start_date, parent?.start_date)}
          max={parent?.due_date ?? project.end_date ?? undefined}
          priority={draft.priority}
          labels={draft.labels}
          errors={draft.errors}
          onResponsible={draft.setResponsible}
          onDate={draft.setDueDate}
          onPriority={draft.setPriority}
          onLabels={draft.setLabels}
        />
        <button
          type="button"
          onClick={cancel}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5  text-neutral-100 "
        >
          {draft.busy ? "Guardando…" : "Guardar"}
        </button>
      </fieldset>
      <span
        ref={probe}
        aria-hidden="true"
        className="invisible pointer-events-none col-start-1 row-start-1 w-max max-w-36 justify-self-start self-center"
      >
        {alignmentState && <StateLabel {...alignmentState} />}
      </span>
      {draft.uncertain && onCheckCreation && (
        <button
          type="button"
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs underline"
          onClick={onCheckCreation}
        >
          Consultar tareas antes de otra creación
        </button>
      )}
      {draft.uncertain && (
        <button
          type="button"
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs underline"
          onClick={() => onClose(true)}
        >
          Cerrar borrador sin reenviar
        </button>
      )}
      {draft.error && (
        <p
          tabIndex={-1}
          role="alert"
          className="col-start-1 mb-0 mt-1 break-words text-red-700 dark:text-red-400"
        >
          {draft.error}
        </p>
      )}
    </form>
  );
}
