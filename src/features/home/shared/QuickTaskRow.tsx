import { useEffect, useId, useLayoutEffect, useRef } from "react";
import Tooltip from "../../../shared/Tooltip";
import { taskCreationStart } from "./task-fields/taskDates";
import TaskOptionalProperties from "./task-form/TaskOptionalProperties";
import type { Project, ProjectCatalogs, Task } from "../types";
import { useQuickTask } from "../views/List/hooks/useQuickTask";
import CheckIcon from "../../../shared/icons/CheckIcon";

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
  const pending = useRef(false);
  const composing = useRef(false);
  const insideEvents = useRef(new WeakSet<Event>());
  const id = useId();
  const differentState = Boolean(
    groupCode && draft.state && draft.state.code !== groupCode,
  );
  const stateHelp = `Se creará en ${draft.state?.name}. El grupo requiere datos adicionales para crear en su estado.`;
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
      className="flex w-full flex-wrap items-center gap-2 px-2.5 py-1.5 text-xs"
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
        className="m-0 flex min-w-0 flex-1 items-center gap-2 border-0 p-0"
      >
        <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
        <div className="min-w-0 flex-1">
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
              className="min-w-0 flex-1 border-0 bg-transparent outline-none focus-visible:outline-2 focus-visible:outline-neutral-700 dark:focus-visible:outline-neutral-200 aria-invalid:outline-red-700"
            />
            {differentState && draft.state && (
              <Tooltip label={stateHelp}>
                {(description) => (
                  <button
                    type="button"
                    aria-label={stateHelp}
                    aria-describedby={description}
                    className="inline-flex max-w-32 shrink-0 cursor-help items-center gap-1 rounded-md px-1.5 py-1 text-xs text-neutral-700 dark:text-neutral-300"
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
          className="cursor-pointer px-2 py-1 text-neutral-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-neutral-900 px-2.5 py-1 font-medium text-neutral-100 dark:bg-white dark:text-neutral-900"
        >
          {draft.busy ? "Guardando…" : "Guardar"}
        </button>
      </fieldset>
      {draft.uncertain && onCheckCreation && (
        <button
          type="button"
          className="cursor-pointer rounded-md px-3 py-1.5 text-xs underline"
          onClick={onCheckCreation}
        >
          Consultar tareas antes de otra creación
        </button>
      )}
      {draft.uncertain && (
        <button
          type="button"
          className="cursor-pointer rounded-md px-3 py-1.5 text-xs underline"
          onClick={() => onClose(true)}
        >
          Cerrar borrador sin reenviar
        </button>
      )}
      {draft.error && (
        <p
          tabIndex={-1}
          role="alert"
          className="col-start-1 mb-0 mt-1 wrap-break-word text-red-700 dark:text-red-400"
        >
          {draft.error}
        </p>
      )}
    </form>
  );
}
