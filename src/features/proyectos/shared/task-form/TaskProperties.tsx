import { useState } from "react";
import type { FieldErrors } from "../../utils/formErrors";
import { groupTaskStates } from "../../utils/stateGroups";
import type {
  Label,
  Project,
  Task,
} from "../../../../core/interfaces/task.interface";
import type {
  ProjectCatalogs,
  ProjectTaskState,
} from "../../../../core/interfaces/project.interface";
import TaskOptionalProperties from "./TaskOptionalProperties";
import TaskProperty from "../task-fields/TaskProperty";
import CheckIcon from "../../../../shared/Icons/CheckIcon";
import SettingsIcon from "../../../../shared/Icons/SettingsIcon";
import CalendarIcon from "../../../../shared/Icons/CalendarIcon";
import StatusIcon from "../../../../shared/Icons/StatusIcon";
import { taskAssignees } from "../../utils/taskAssignees";
import Calendar from "../task-fields/Calendar";
import TaskDateValue from "../task-fields/TaskDateValue";
import { formatTaskDate } from "../../utils/taskHierarchy";
import StateIcon from "../task-status/StateIcon";

interface TaskPropertiesProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  stateCode: string;
  responsible: number[];
  dueDate: string;
  startDate: string;
  creationMin?: string;
  onStartDate: (value: string) => void;
  priority: number | null;
  labels: Label[];
  errors: FieldErrors;
  onState: (value: string) => void;
  onResponsible: (value: number[]) => void;
  onDate: (value: string) => void;
  onPriority: (value: number | null) => void;
  onLabels: (value: Label[]) => void;
  onConfigure: () => void;
}

export default function TaskProperties({
  project,
  catalogs,
  task,
  parent,
  stateCode,
  responsible,
  dueDate,
  priority,
  labels,
  errors,
  onState,
  onResponsible,
  onDate,
  onPriority,
  onLabels,
  onConfigure,
  startDate,
  onStartDate,
  creationMin,
}: TaskPropertiesProps) {
  const [stateSearch, setStateSearch] = useState("");
  const canAssign =
    project.permissions.manage && (!task || task.permissions.assign);
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const selectedState = task?.state_code ?? stateCode;
  const states = project.task_states.states.filter(
    (state) =>
      task ||
      canAssign ||
      state.category === "not_started" ||
      (!state.category && state.code === "PENDIENTE"),
  );
  const groups = groupTaskStates(
    states.filter((state) =>
      state.name
        .toLocaleLowerCase("es")
        .includes(stateSearch.trim().toLocaleLowerCase("es")),
    ),
  );
  const stateName =
    states.find((state) => state.code === selectedState)?.name ??
    task?.state_name ??
    selectedState;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Propiedades de la tarea"
    >
      <TaskProperty
        id="task-initial-state"
        label={task ? "Estado actual" : "Estado inicial"}
        value={stateName}
        icon={StatusIcon}
        error={errors["task-initial-state"]}
      >
        {(close) => (
          <>
            <label
              htmlFor="task-state-search"
              className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              Buscar estado
            </label>
            <input
              id="task-state-search"
              name="state_search"
              type="search"
              placeholder="Buscar estado…"
              value={stateSearch}
              onChange={(event) => setStateSearch(event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
              {groups.map(
                (group: { label: string; states: ProjectTaskState[] }) => (
                  <section key={group.label} aria-label={group.label}>
                    <h3 className="px-3 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800/50">
                      {group.label}
                    </h3>
                    {group.states.map((state) => (
                      <button
                        key={state.code}
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50"
                        aria-pressed={selectedState === state.code}
                        disabled={Boolean(task) || !canAssign}
                        onClick={() => {
                          onState(state.code);
                          close();
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <StateIcon
                            code={state.code}
                            name={state.name}
                            category={state.category}
                            color={
                              state.tema ? state.tema.color : "neutral-700"
                            }
                          />
                          <span>{state.name}</span>
                        </div>
                        {selectedState === state.code && (
                          <CheckIcon className="size-4" />
                        )}
                      </button>
                    ))}
                  </section>
                ),
              )}
              {groups.length === 0 && (
                <p className="p-3 text-xs text-neutral-500" role="status">
                  No hay estados que coincidan.
                </p>
              )}
            </div>
            {(task || !canAssign) && (
              <p className="mt-2 text-xs text-neutral-500">
                {task
                  ? "Cambia el estado desde las acciones autorizadas de la tarea."
                  : "Las tareas nuevas se crean pendientes."}
              </p>
            )}
            {canConfigure && (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 cursor-pointer"
                onClick={() => {
                  close();
                  onConfigure();
                }}
              >
                <SettingsIcon className="size-4" />
                Configurar estados
              </button>
            )}
          </>
        )}
      </TaskProperty>
      <TaskProperty
        id="task-start"
        label="Fecha de inicio"
        value={formatTaskDate(startDate)}
        icon={CalendarIcon}
        error={errors["task-start"]}
        content={
          <>
            <CalendarIcon className="size-4" />
            <TaskDateValue value={startDate} />
          </>
        }
      >
        {(close) => (
          <Calendar
            label="Fecha de inicio"
            optional={false}
            value={startDate}
            min={
              creationMin ??
              parent?.start_date ??
              project.start_date ??
              undefined
            }
            max={dueDate || parent?.due_date || project.end_date || undefined}
            onChange={onStartDate}
            close={close}
          />
        )}
      </TaskProperty>
      <TaskOptionalProperties
        project={project}
        catalogs={catalogs}
        responsible={responsible}
        dueDate={dueDate}
        priority={priority}
        labels={labels}
        errors={errors}
        canAssign={canAssign}
        readOnlyResponsible={
          task
            ? taskAssignees(task)
                .map((person) => person.name)
                .join(", ") || "Sin persona asignada"
            : "Tú"
        }
        min={startDate || parent?.start_date || project.start_date || undefined}
        max={parent?.due_date ?? project.end_date ?? undefined}
        onResponsible={onResponsible}
        onDate={onDate}
        onPriority={onPriority}
        onLabels={onLabels}
      />
    </div>
  );
}
