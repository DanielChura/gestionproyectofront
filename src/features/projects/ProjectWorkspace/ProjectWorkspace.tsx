import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { errorText } from "../../auth/api";
import {
  changeDependency,
  changeTaskState,
  createTask,
  getProject,
  getTasks,
  updateTask,
} from "../services";
import type {
  EditTaskPayload,
  Project,
  ProjectCatalogs,
  ProjectTaskConfiguration,
  Task,
  TaskAction,
  TaskActionKind,
  TaskFormPayload,
  TaskGroupingPreferences,
  TaskStatePayload,
} from "../types";

import { useToast } from "../../../hooks/useToast";
import PlusIcon from "../../../shared/icons/PlusIcon";
import DependencyForm from "../DependencyForm/DependencyForm";
import LabelList from "../LabelList/LabelList";
import Modal from "../Modal/Modal";
import TaskDetailDialog from "../TaskDetail/TaskDetailDialog";
import { useTaskDetailNavigation } from "../TaskDetail/useTaskDetail";
import TaskBoard from "../TaskBoard/TaskBoard";
import ProjectChartsPage from "../ProjectOverview/ProjectOverviewPage";
import TaskForm from "../TaskForm/TaskForm";
import TaskGroupingControl from "../TaskList/TaskGroupingControl";
import TaskList from "../TaskList/TaskList";
import type { TaskGroupControls } from "../TaskList/TaskList";
import TaskGroupExpansionControl from "../TaskList/TaskGroupExpansionControl";
import { reconcileTasks } from "../taskCollection";
import TaskSearch from "../TaskList/TaskSearch";
import TaskStatusSettingsControl from "../TaskList/TaskStatusSettingsControl";
import { taskHierarchy } from "../TaskList/taskHierarchy";
import TaskStateForm from "../TaskStateForm/TaskStateForm";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";
import ProjectHeader from "./ProjectHeader";
import ProjectToolbar from "./ProjectToolbar";

interface ProjectWorkspaceProps {
  projectId: number;
  catalogs: ProjectCatalogs;
  catalogLoading: boolean;
  catalogError: string;
  onRetryCatalogs: () => void;
  taskCreationSequence?: number;
  onTaskCreationHandled?: (sequence: number) => void;
}

export default function ProjectWorkspace({
  projectId,
  catalogs,
  catalogLoading,
  catalogError,
  onRetryCatalogs,
  taskCreationSequence,
  onTaskCreationHandled,
}: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [action, setAction] = useState<TaskAction | null>(null);
  const [configuringStates, setConfiguringStates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [refreshError, setRefreshError] = useState("");
  const [configurationVersion, setConfigurationVersion] = useState(0);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [groupControls, setGroupControls] = useState<TaskGroupControls | null>(
    null,
  );
  const collectionVersion = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { addToast } = useToast();
  const taskDetail = useTaskDetailNavigation();
  const [searchParams] = useSearchParams();

  const view = searchParams.get("vista") ?? "lista";
  const [search, setSearch] = useState("");
  const [preferences, setPreferences] = useState<TaskGroupingPreferences>({
    mode: "state",
    order: "asc",
    separatePeople: false,
    separateLabels: false,
  });
  const handledCreation = useRef<number | undefined>(undefined);
  const boardTasks = useMemo(() => {
    if (view !== "tablero" || !search.trim()) return tasks;
    const visible = taskHierarchy(tasks, search).visible;
    return tasks.filter((task) => visible.has(task.id));
  }, [view, tasks, search]);

  const loadTasks = useCallback(async () => {
    const version = collectionVersion.current;
    const items = await getTasks(projectId);
    if (mounted.current && version === collectionVersion.current)
      setTasks((current) => reconcileTasks(current, items, true));
  }, [projectId]);

  useEffect(() => {
    let current = true;
    const collection = collectionVersion;
    void Promise.resolve().then(() => {
      if (current) {
        setLoading(true);
        setError("");
      }
    });

    void Promise.all([getProject(projectId), getTasks(projectId)])
      .then(([details, items]) => {
        if (current) {
          setProject(details);
          setTasks(items);
        }
      })
      .catch((failure: unknown) => {
        if (current) {
          setError(errorText(failure));
          addToast({
            icon: "error",
            title: "No se pudo cargar el proyecto",
            message: errorText(failure),
          });
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
      collection.current++;
    };
  }, [projectId, addToast, reload]);

  useEffect(() => {
    if (
      !project ||
      taskCreationSequence === undefined ||
      handledCreation.current === taskCreationSequence
    ) {
      return;
    }

    let current = true;

    void Promise.resolve().then(() => {
      if (!current) {
        return;
      }

      handledCreation.current = taskCreationSequence;

      if (project.permissions.create_tasks) {
        setAction({ kind: "create" });
      } else {
        addToast({
          icon: "alert",
          title: "Sin permiso",
          message:
            "No tienes permiso efectivo para crear tareas en este proyecto.",
        });
      }

      onTaskCreationHandled?.(taskCreationSequence);
    });

    return () => {
      current = false;
    };
  }, [project, taskCreationSequence, onTaskCreationHandled, addToast]);

  const activeTask =
    action && action.kind !== "create"
      ? tasks.find((task) => task.id === action.taskId)
      : undefined;

  const activeAction =
    action !== null && (action.kind === "create" || activeTask !== undefined);

  const title =
    action?.kind === "create"
      ? "Nueva tarea"
      : action?.kind === "child"
        ? "Nueva subtarea"
        : action?.kind === "dependencies"
          ? `Dependencias de ${activeTask?.name ?? ""}`
          : action?.kind === "state"
            ? "Cambiar estado"
            : action?.kind === "detail"
              ? "Detalle de tarea"
              : "Editar datos de tarea";

  function acceptTask(saved: Task) {
    if (!mounted.current) return;
    collectionVersion.current++;
    setTasks((current) => reconcileTasks(current, [saved]));
    addToast({ icon: "success", title: "Guardado", message: saved.name });
  }

  async function save(data: TaskFormPayload) {
    setBusy(true);

    try {
      if (action?.kind === "edit" && activeTask && !("state_code" in data)) {
        acceptTask(await updateTask(projectId, activeTask.id, data));
      } else if (
        (action?.kind === "create" || action?.kind === "child") &&
        "state_code" in data
      ) {
        acceptTask(await createTask(projectId, data));
      } else {
        throw new Error(
          "La acción ya no está disponible. Vuelve a abrir el formulario.",
        );
      }

      setAction(null);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function state(data: TaskStatePayload) {
    if (!activeTask || action?.kind !== "state") {
      throw new Error("La tarea ya no está disponible.");
    }

    setBusy(true);

    try {
      acceptTask(await changeTaskState(projectId, activeTask.id, data));
      setAction(null);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function dependency(id: number, remove: boolean) {
    if (!activeTask || action?.kind !== "dependencies") {
      throw new Error("La tarea ya no está disponible.");
    }
    setBusy(true);

    try {
      await changeDependency(projectId, activeTask.id, id, remove);

      setTasks((current) =>
        current.map((task) =>
          task.id === activeTask.id
            ? {
                ...task,
                dependencies: remove
                  ? task.dependencies.filter((item) => item !== id)
                  : [...task.dependencies, id],
              }
            : task,
        ),
      );

      addToast({
        icon: "success",
        title: "Dependencia actualizada",
        message: remove ? "Dependencia retirada" : "Dependencia agregada",
      });
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    if (!mounted.current) return;
    collectionVersion.current++;
    const { tasks: confirmed, ...flow } = configuration;
    setProject((current) =>
      current ? { ...current, task_states: flow } : current,
    );
    if (confirmed) setTasks(confirmed);
    setConfigurationVersion((value) => value + 1);
    setRefreshError("");
    addToast({
      icon: "success",
      title: "Estados actualizados",
      message: project?.name ?? "",
    });
    if (!confirmed)
      void loadTasks().catch((failure: unknown) => {
        if (mounted.current)
          addToast({
            icon: "error",
            title: "Lista no actualizada",
            message: errorText(failure),
          });
      });
  }

  function actionForm(currentProject: Project): ReactNode {
    if (!action) return null;
    if (catalogLoading || catalogError)
      return (
        <p
          role="status"
          className="p-5 text-xs text-neutral-600 dark:text-neutral-400"
        >
          {catalogError
            ? "No se pudo cargar el catálogo. Reintenta antes de editar."
            : "Cargando catálogos…"}
        </p>
      );

    if (action.kind === "create") {
      return (
        <TaskForm
          project={currentProject}
          catalogs={catalogs}
          initialState={action.stateCode}
          onSubmit={save}
          onConfigured={configured}
          onClose={() => setAction(null)}
        />
      );
    }

    if (!activeTask) {
      return null;
    }

    switch (action.kind) {
      case "edit":
        return (
          <TaskForm
            project={currentProject}
            catalogs={catalogs}
            task={activeTask}
            onSubmit={save}
            onConfigured={configured}
            onClose={() => setAction(null)}
          />
        );
      case "child":
        return (
          <TaskForm
            project={currentProject}
            catalogs={catalogs}
            parent={activeTask}
            onSubmit={save}
            onConfigured={configured}
            onClose={() => setAction(null)}
          />
        );
      case "state":
        return (
          <TaskStateForm
            task={activeTask}
            states={currentProject.task_states.states}
            onSubmit={state}
          />
        );

      case "dependencies":
        return (
          <DependencyForm
            task={activeTask}
            tasks={tasks}
            onChange={dependency}
          />
        );
    }
  }

  if (!project) return null;

  function openTaskAction(kind: TaskActionKind, taskId: number) {
    if (kind === "detail") taskDetail.openTaskDetail({ projectId, taskId });
    else setAction({ kind, taskId });
  }

  async function patchTask(task: Task, data: Partial<EditTaskPayload>) {
    acceptTask(await updateTask(projectId, task.id, data));
  }

  async function changeState(task: Task, data: TaskStatePayload) {
    acceptTask(await changeTaskState(projectId, task.id, data));
  }

  const primaryAction = project.permissions.create_tasks ? (
    <button
      type="button"
      disabled={busy || catalogLoading || Boolean(catalogError)}
      onClick={() => setAction({ kind: "create" })}
      aria-label="Crear nueva tarea"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs  text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
    >
      <span aria-hidden="true">
        <PlusIcon className="size-4" />
      </span>
      <span>Agregar tarea</span>
    </button>
  ) : null;

  return (
    <main
      className="flex min-h-full flex-col text-neutral-800 dark:text-neutral-100 md:h-full md:min-h-0"
      id="main-content"
    >
      <ProjectHeader
        key={project.id}
        project={project}
        view={view}
        taskCount={new Set(tasks.map((task) => task.id)).size}
        filteredCount={view === "lista" ? filteredCount : null}
      />

      {project.requirements.length > 0 && (
        <section
          aria-label="Requisitos existentes del proyecto"
          className="shrink-0"
        >
          <LabelList labels={project.requirements} />
        </section>
      )}

      {(view === "lista" || view === "tablero") && (
        <section
          className="flex min-h-0 flex-1 flex-col"
          aria-label={view === "lista" ? "Lista de trabajo" : "Tablero"}
        >
          {view === "lista" && <h2 className="sr-only">Lista de trabajo</h2>}
          <ProjectToolbar
            action={
              <div className="flex items-center gap-2">
                <TaskSearch value={search} onChange={setSearch} />
                {primaryAction}
              </div>
            }
          >
            {view === "lista" && (
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <TaskGroupingControl
                  preferences={preferences}
                  onChange={setPreferences}
                />
              </fieldset>
            )}
            {project.permissions.manage &&
              project.task_states.can_configure && (
                <TaskStatusSettingsControl
                  onClick={() => setConfiguringStates(true)}
                />
              )}
            {view === "lista" && (
              <TaskGroupExpansionControl
                expanded={groupControls?.expanded ?? false}
                disabled={groupControls?.disabled ?? true}
                controls={groupControls?.controls ?? ""}
                onToggle={() => groupControls?.toggle()}
              />
            )}
          </ProjectToolbar>
          {view === "lista" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TaskList
                project={project}
                tasks={tasks}
                catalogs={catalogs}
                search={search}
                preferences={preferences}
                onMoved={(items) => {
                  collectionVersion.current++;
                  setTasks((current) => reconcileTasks(current, items, true));
                }}
                onCountChange={setFilteredCount}
                onGroupControls={setGroupControls}
                onAction={openTaskAction}
                onCreated={acceptTask}
                onPatch={patchTask}
                onState={changeState}
              />
            </div>
          ) : (
            <TaskBoard
              project={project}
              tasks={boardTasks}
              catalogs={catalogs}
              onAction={openTaskAction}
              onState={changeState}
            />
          )}
        </section>
      )}

      {view === "gantt" && (
        <section className="px-6 py-10" aria-label="Gantt">
          <h2 className="text-lg">Gantt</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Esta vista está pendiente de implementación. Puedes gestionar las
            tareas en Lista.
          </p>
          <Link to="?vista=lista">Volver a Lista</Link>
        </section>
      )}

      {view === "overview" && (
        <section
          className="flex min-h-0 flex-1 flex-col"
          aria-label="Resumen del proyecto"
        >
          <ProjectChartsPage />
        </section>
      )}

      {action && !activeAction && (
        <p
          className="border border-neutral-200 dark:border-neutral-800 bg-white px-3 py-2 text-sm"
          role="alert"
        >
          La tarea ya no está disponible. Vuelve a seleccionar una tarea de la
          lista.
        </p>
      )}

      {configuringStates && (
        <TaskStatusConfiguration
          project={project}
          onConfigured={configured}
          onClose={() => setConfiguringStates(false)}
        />
      )}
      {taskDetail.target && (
        <TaskDetailDialog
          version={configurationVersion}
          project={project}
          catalogs={catalogs}
          target={taskDetail.target}
          onUpdated={acceptTask}
          onNavigate={taskDetail.openTaskDetail}
          onClose={taskDetail.closeTaskDetail}
        />
      )}
      {activeAction && (
        <Modal
          busy={busy}
          title={title}
          taskComposer={
            action?.kind === "create" ||
            action?.kind === "edit" ||
            action?.kind === "child"
          }
          onClose={() => setAction(null)}
        >
          {actionForm(project)}
        </Modal>
      )}
    </main>
  );
}
