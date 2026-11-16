import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import PlusIcon from "../../../../shared/icons/PlusIcon";
import ProjectToolbar from "../../shared/ProjectToolbar";
import TaskDialog from "../../shared/task-dialog/TaskDialog";
import TaskStatusConfiguration from "../../shared/task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import TaskStatusSettingsControl from "../../shared/task-status/TaskStatusSettingsControl";
import type {
  Project,
  TaskActionKind,
  TaskDialogController,
} from "../../types";
import TaskGroupExpansionFilter from "../../components/filters/TaskGroupExpansionFilter";
import TaskGroupingFilter from "../../components/filters/TaskGroupingFilter";
import TaskSearchFilter from "../../components/filters/TaskSearchFilter";
import MyTasksToggle from "../../shared/MyTasksToggle";
import { useMyTasksFilter } from "../../hooks/useMyTasksFilter";
import { useTaskGrouping } from "../../hooks/useTaskGrouping";
import TaskBoard from "./components/TaskBoard";
import { useBoard } from "./hooks/useBoard";

interface BoardViewProps {
  project: Project;
  onProjectChange: Dispatch<SetStateAction<Project | null>>;
  initialCreate?: number;
  onCreateHandled?: () => void;
}

export default function BoardView({
  project,
  onProjectChange,
  initialCreate,
  onCreateHandled,
}: BoardViewProps) {
  const {
    tasks,
    acceptTask,
    catalogs,
    search,
    preferences,
    setPreferences,
    setSearch,
    setAction,
    changeState,
    patchTask,
    action,
    busy,
    saveTask,
    changeDependency,
    configuringStates,
    setConfiguringStates,
    configuredStates,
  } = useBoard(project, onProjectChange, initialCreate, onCreateHandled);


  const myTasks = useMyTasksFilter(tasks);
  const states = project.task_states?.states ?? [];
  const boardPreferences = useMemo(
    () => ({ ...preferences, separatePeople: true, separateLabels: true }),
    [preferences],
  );
  const { groups } = useTaskGrouping(
    myTasks.tasks,
    search,
    states,
    catalogs.priorities,
    boardPreferences,
  );

  const [expandedParents, setExpandedParents] = useState<Set<number>>(
    new Set(),
  );
  const parentIds = useMemo(() => {
    const ids = new Set(myTasks.tasks.map((task) => task.id));
    return new Set(
      myTasks.tasks.flatMap((task) =>
        task.parent_id !== null && ids.has(task.parent_id)
          ? [task.parent_id]
          : [],
      ),
    );
  }, [myTasks.tasks]);
  const allExpanded =
    parentIds.size > 0 && [...parentIds].every((id) => expandedParents.has(id));

  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const canCreate = project.permissions.create_tasks;
  const dialog: TaskDialogController = {
    project,
    tasks,
    catalogs,
    action,
    busy,
    close: () => setAction(null),
    saveTask,
    changeState,
    changeDependency,
    configuredStates,
  };

  function handleAction(
    kind: TaskActionKind | "create",
    id: number,
    extra?: { stateCode?: string },
  ) {
    if (kind === "create") {
      setAction({ kind: "create", stateCode: extra?.stateCode });
    } else {
      setAction({ kind, taskId: id });
    }
  }

  function toggleParent(id: number) {
    setExpandedParents((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section aria-label="Tablero" className="flex min-h-0 flex-1 flex-col">
      <ProjectToolbar
        action={
          <div className="flex items-center gap-2">
            <MyTasksToggle
              user={myTasks.user}
              active={myTasks.mine}
              onToggle={myTasks.toggleMine}
            />
            {canCreate && (
              <button
                type="button"
                aria-label="Crear nueva tarea"
                onClick={() => setAction({ kind: "create" })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <PlusIcon className="size-4" />
                Agregar tarea
              </button>
            )}
          </div>
        }
      >
        <TaskGroupingFilter
          preferences={preferences}
          onChange={setPreferences}
        />
        <TaskGroupExpansionFilter
          expanded={allExpanded}
          disabled={parentIds.size === 0}
          onToggle={() =>
            setExpandedParents(allExpanded ? new Set() : new Set(parentIds))
          }
        />
        <TaskSearchFilter mode="button" value={search} onChange={setSearch} />
        {canConfigure && (
          <TaskStatusSettingsControl
            onClick={() => setConfiguringStates(true)}
          />
        )}
      </ProjectToolbar>

      <TaskBoard
        project={project}
        tasks={myTasks.tasks}
        groups={groups}
        preferences={preferences}
        catalogs={catalogs}
        expandedParents={expandedParents}
        onToggleParent={toggleParent}
        onAction={handleAction}
        onState={changeState}
        onPatch={patchTask}
      />

      <TaskDialog controller={dialog} onUpdated={acceptTask} />
      {configuringStates && (
        <TaskStatusConfiguration
          project={project}
          onConfigured={configuredStates}
          onClose={() => setConfiguringStates(false)}
        />
      )}
    </section>
  );
}
