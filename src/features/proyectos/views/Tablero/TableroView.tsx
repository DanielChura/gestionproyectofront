import { useMemo } from "react";
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
import { taskHierarchy } from "../../utils/taskHierarchy";
import TableroFilters from "./components/TableroFilters";
import TaskBoard from "./components/TaskBoard";
import { useTablero } from "./hooks/useTablero";

interface TableroViewProps {
  project: Project;
  onProjectChange: Dispatch<SetStateAction<Project | null>>;
  initialCreate?: number;
  onCreateHandled?: () => void;
}

export default function TableroView({
  project,
  onProjectChange,
  initialCreate,
  onCreateHandled,
}: TableroViewProps) {
  const {
    tasks,
    catalogs,
    search,
    setSearch,
    setAction,
    changeState,
    action,
    busy,
    saveTask,
    changeDependency,
    configuringStates,
    setConfiguringStates,
    configuredStates,
  } = useTablero(project, onProjectChange, initialCreate, onCreateHandled);

  const boardTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const visible = taskHierarchy(tasks, search).visible;
    return tasks.filter((task) => visible.has(task.id));
  }, [tasks, search]);

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

  function handleAction(kind: TaskActionKind, id: number) {
    setAction({ kind: kind === "detail" ? "edit" : kind, taskId: id });
  }

  return (
    <section aria-label="Tablero" className="flex min-h-0 flex-1 flex-col">
      <ProjectToolbar
        action={
          (canConfigure || canCreate) && (
            <div className="flex items-center gap-2">
              {canConfigure && (
                <TaskStatusSettingsControl
                  onClick={() => setConfiguringStates(true)}
                />
              )}
              {canCreate && (
                <button
                  type="button"
                  aria-label="Crear nueva tarea"
                  onClick={() => setAction({ kind: "create" })}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
                >
                  <PlusIcon className="size-4" />
                  Agregar tarea
                </button>
              )}
            </div>
          )
        }
      >
        <TableroFilters value={search} onChange={setSearch} />
      </ProjectToolbar>

      <TaskBoard
        project={project}
        tasks={boardTasks}
        catalogs={catalogs}
        onAction={handleAction}
        onState={changeState}
      />

      <TaskDialog controller={dialog} />
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
