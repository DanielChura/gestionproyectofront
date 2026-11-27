import { useState } from "react";
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
import CheckIcon from "../../../../shared/icons/CheckIcon";
import SettingsIcon from "../../../../shared/icons/SettingsIcon";
import CalendarIcon from "../../../../shared/icons/CalendarIcon";
import StatusIcon from "../../../../shared/icons/StatusIcon";
import Calendar from "../task-fields/Calendar";
import TaskDateValue from "../task-fields/TaskDateValue";
import { formatTaskDate } from "../../utils/taskHierarchy";
import { getIcon } from "../../../../shared/icons/icon-catalog";

interface TaskPropertiesProps {
  hideCalendar?: boolean;
  project: Project;
  catalogs: ProjectCatalogs;
  parent?: Task;
  stateCode: string;
  responsible: number[];
  dueDate: string;
  startDate: string;
  creationMin?: string;
  onStartDate: (value: string) => void;
  priority: number | null;
  labels: Label[];
  onState: (value: string) => void;
  onResponsible: (value: number[]) => void;
  onDate: (value: string) => void;
  onPriority: (value: number | null) => void;
  onLabels: (value: Label[]) => void;
  onConfigure: () => void;
}

export default function TaskProperties({
  hideCalendar = false,
  project,
  catalogs,
  parent,
  stateCode,
  responsible,
  dueDate,
  priority,
  labels,
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
  const canAssign = project.permissions.assign_tasks;
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const selectedState = stateCode;
  const states = project.task_states.states.filter(
    (state) =>
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
    selectedState;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Propiedades de la tarea"
    >
      <TaskProperty
        id="task-initial-state"
        label="Estado inicial"
        value={stateName}
        icon={StatusIcon}
      >
        {(close) => (
          <>
            <label
              htmlFor="task-state-search"
              className="text-xs  text-neutral-700 dark:text-neutral-300"
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
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
              {groups.map(
                (group: { label: string; states: ProjectTaskState[] }) => (
                  <section key={group.label} aria-label={group.label}>
                    <h3 className="px-3 py-1 text-xs text-neutral-500 tracking-wider bg-neutral-50 dark:bg-neutral-800/50 dark:text-neutral-400">
                      {group.label}
                    </h3>
                    {group.states.map((state) => {
                      const Icon = getIcon(state.tema?.icono);
                      const tone = state.tema?.color ?? "neutral-700";
                      return (
                        <button
                          key={state.code}
                          type="button"
                          className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50"
                          aria-pressed={selectedState === state.code}
                          disabled={!canAssign}
                          onClick={() => {
                            onState(state.code);
                            close();
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex shrink-0"
                              style={tone ? { color: tone } : undefined}
                            >
                              <Icon className="size-4" fill />
                            </span>
                            <span>{state.name}</span>
                          </div>
                          {selectedState === state.code && (
                            <CheckIcon className="size-4" />
                          )}
                        </button>
                      );
                    })}
                  </section>
                ),
              )}
              {groups.length === 0 && (
                <p
                  className="p-3 text-xs text-neutral-500 dark:text-neutral-400"
                  role="status"
                >
                  No hay estados que coincidan.
                </p>
              )}
            </div>
            {!canAssign && (
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Las tareas nuevas se crean pendientes.
              </p>
            )}
            {canConfigure && (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 text-xs  text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 cursor-pointer"
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
      {!hideCalendar && (
        <TaskProperty
          id="task-start"
          label="Fecha de inicio"
          value={formatTaskDate(startDate)}
          icon={CalendarIcon}
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
      )}
      <TaskOptionalProperties
        hideCalendar={hideCalendar}
        project={project}
        catalogs={catalogs}
        responsible={responsible}
        dueDate={dueDate}
        priority={priority}
        labels={labels}
        canAssign={canAssign}
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
