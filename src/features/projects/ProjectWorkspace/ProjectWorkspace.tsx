import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";
import { errorText } from "../../auth/api";
import {
  changeDependency,
  changeTaskState,
  createTask,
  getProject,
  getTasks,
} from "../services";
import type {
  TaskPatchPayload,
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
import TaskGanttEntry from "../TaskGantt/TaskGanttEntry";
import TaskForm from "../TaskForm/TaskForm";
import TaskGroupingControl from "../TaskList/TaskGroupingControl";
import TaskList from "../TaskList/TaskList";
import type { TaskGroupControls } from "../TaskList/TaskList";
import TaskGroupExpansionControl from "../TaskList/TaskGroupExpansionControl";
import { reconcileTask, reconcileTasks } from "../taskCollection";
import TaskSearch from "../TaskList/TaskSearch";
import TaskStatusSettingsControl from "../TaskList/TaskStatusSettingsControl";
import { taskHierarchy } from "../TaskList/taskHierarchy";
import TaskStateForm from "../TaskStateForm/TaskStateForm";
import TaskStatusConfiguration from "../TaskStatusConfiguration/TaskStatusConfiguration";
import TaskSyncProvider from "../TaskSyncProvider";
import { useTaskSync } from "../useTaskSync";
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

function ProjectWorkspaceContent({
  projectId,
  catalogs,
  catalogLoading,
  catalogError,
  onRetryCatalogs,
  taskCreationSequence,
  onTaskCreationHandled,
}: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [storedTasks, setTasks] = useState<Task[]>([]);
  const sync = useTaskSync();
  const snapshots = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot);
  const tasks = useMemo(() => storedTasks.map((task) => reconcileTask(task, snapshots.get(task.id) ?? task)), [storedTasks, snapshots]);
  const [action, setAction] = useState<TaskAction | null>(null);
  const [configuringStates, setConfiguringStates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [refreshError, setRefreshError] = useState("");
  const [configurationVersion, setConfigurationVersion] = useState(0);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [groupControls, setGroupControls] = useState<TaskGroupControls | null>(null);
  const collectionVersion = useRef(0);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
    const items = sync.observeMany(await sync.read(() => getTasks(projectId)));
    if (mounted.current && version === collectionVersion.current) setTasks((current) => reconcileTasks(current, items, true));
    return items;
  }, [projectId, sync]);

  useEffect(() => {
    let current = true;
    const collection = collectionVersion;
    void Promise.resolve().then(() => { if (current) { setLoading(true); setError(""); } });

    void sync.read(() => Promise.all([getProject(projectId), getTasks(projectId)]))
      .then(([details, items]) => {
        if (current) {
          setProject(details);
          setTasks(sync.observeMany(items));
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
  }, [projectId, addToast, reload, sync]);

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
    if (!mounted.current || !sync.isCurrent()) return;
    collectionVersion.current++;
    const confirmed = sync.observe(saved);
    setTasks((current) => reconcileTasks(current, [confirmed]));
    addToast({ icon: "success", title: "Guardado", message: saved.name });
  }

  async function save(data: TaskFormPayload) {
    setBusy(true);

    try {
      if (action?.kind === "edit" && activeTask && !("state_code" in data)) {
        acceptTask(await sync.patch(activeTask.id, data));
      } else if (
        (action?.kind === "create" || action?.kind === "child") &&
        "state_code" in data
      ) {
        acceptTask(sync.confirm(await createTask(projectId, data)));
      } else {
        throw new Error(
          "La acción ya no está disponible. Vuelve a abrir el formulario.",
        );
      }

      if (action?.kind !== "edit") setAction(null);
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
      acceptTask(sync.confirm(await changeTaskState(projectId, activeTask.id, data)));
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
    if (!mounted.current || !sync.isCurrent()) return;
    collectionVersion.current++;
    const { tasks: confirmed, ...flow } = configuration;
    setProject((current) => current ? { ...current, task_states: flow } : current);
    if (confirmed) setTasks(sync.confirmMany(confirmed));
    setConfigurationVersion((value) => value + 1);
    setRefreshError("");
    addToast({ icon: "success", title: "Estados actualizados", message: project?.name ?? "" });
    if (!confirmed) void loadTasks().catch((failure: unknown) => {
      if (mounted.current) setRefreshError(`Estados guardados. No se pudo actualizar la lista: ${errorText(failure)}`);
    });
  }

  function actionForm(currentProject: Project): ReactNode {
    if (!action) return null;
    if (catalogLoading || catalogError) return <p role="status" className="p-5 text-xs text-neutral-600">{catalogError ? "No se pudo cargar el catálogo. Reintenta antes de editar." : "Cargando catálogos…"}</p>;

    if (action.kind === "create") {
      return (
        <TaskForm
          project={currentProject}
          catalogs={catalogs}
          initialState={action.stateCode}
          onCheckCreation={loadTasks}
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
            key={`edit:${activeTask.id}`}
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
            key={`child:${activeTask.id}`}
            parent={activeTask}
          onCheckCreation={loadTasks}
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

  if (!project) return <main id="main-content" className="p-5 text-sm text-neutral-800">
    {loading ? <p role="status">Cargando proyecto…</p> : <div role="alert"><p>{error || "No se pudo cargar el proyecto."}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs hover:bg-neutral-100">Reintentar</button></div>}
  </main>;

  function openTaskAction(kind: TaskActionKind, taskId: number) {
    if (kind === "detail") taskDetail.openTaskDetail({ projectId, taskId });
    else setAction({ kind, taskId });
  }

  async function patchTask(task: Task, data: TaskPatchPayload) {
    acceptTask(await sync.patch(task.id, data));
  }

  async function changeState(task: Task, data: TaskStatePayload) {
    acceptTask(sync.confirm(await changeTaskState(projectId, task.id, data)));
  }

  const primaryAction = project.permissions.create_tasks ? (
    <button
      type="button"
      disabled={busy || catalogLoading || Boolean(catalogError)}
      onClick={() => setAction({ kind: "create" })}
      aria-label="Crear nueva tarea"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
    >
      <span aria-hidden="true">
        <PlusIcon className="size-4" />
      </span>
      <span>Agregar tarea</span>
    </button>
  ) : null;

  return (
    <main
      className="flex min-h-full flex-col text-neutral-800 md:h-full md:min-h-0"
      id="main-content"
    >
      <ProjectHeader
        key={project.id}
        project={project}
        view={view}
        taskCount={new Set(tasks.map((task) => task.id)).size}
        filteredCount={view === "lista" ? filteredCount : null}
      />

      {catalogLoading && <p role="status" className="py-2 text-xs text-neutral-600">Cargando catálogos…</p>}
      {catalogError && <div role="alert" className="flex flex-wrap items-center gap-2 py-2 text-xs text-red-700"><span>No se pudieron cargar los catálogos. {catalogError}</span><button type="button" onClick={onRetryCatalogs} className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-800 hover:bg-neutral-100">Reintentar catálogos</button></div>}
      {refreshError && <div role="alert" className="flex items-center gap-2 py-2 text-xs text-red-700"><span>{refreshError}</span><button type="button" className="cursor-pointer underline" onClick={() => { void loadTasks().then(() => setRefreshError("")).catch((failure: unknown) => setRefreshError(errorText(failure))); }}>Actualizar lista</button></div>}
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
          className="flex min-h-0 flex-1 flex-col bg-white"
          aria-label={view === "lista" ? "Lista de trabajo" : "Tablero"}
        >
          {view === "lista" && <h2 className="sr-only">Lista de trabajo</h2>}
          <ProjectToolbar action={primaryAction}>
            {view === "lista" && <fieldset className="m-0 min-w-0 border-0 p-0">
              <TaskGroupingControl
                preferences={preferences}
                onChange={setPreferences}
              />
            </fieldset>}
            {project.permissions.manage &&
              project.task_states.can_configure && (
                <TaskStatusSettingsControl
                  onClick={() => setConfiguringStates(true)}
                />
              )}
            {view === "lista" && <TaskGroupExpansionControl expanded={groupControls?.expanded ?? false} disabled={groupControls?.disabled ?? true} controls={groupControls?.controls ?? ""} onToggle={() => groupControls?.toggle()} />}
            <TaskSearch value={search} onChange={setSearch} />
          </ProjectToolbar>
          {view === "lista" ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TaskList
                key={project.id}
                project={project}
                tasks={tasks}
                catalogs={catalogs}
                search={search}
                preferences={preferences}
                onMoved={(items) => { if (!sync.isCurrent()) return; const confirmed = sync.confirmMany(items); collectionVersion.current++; setTasks((current) => reconcileTasks(current, confirmed, true)); }}
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

      {view === "gantt" && <TaskGanttEntry
        project={project}
        catalogs={catalogs}
        onCreated={acceptTask}
        tasks={tasks}
        loading={loading}
        error={error}
        onRetry={() => setReload((value) => value + 1)}
        createAction={primaryAction}
        actionsDisabled={busy || catalogLoading || Boolean(catalogError)}
        onAction={openTaskAction}
        onOpenTask={(taskId, section) => taskDetail.openTaskDetail({ projectId, taskId }, section)}
      />}

      {action && !activeAction && (
        <p
          className="border border-neutral-200 bg-white px-3 py-2 text-sm"
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
          initialSection={taskDetail.initialSection}
          onUpdated={acceptTask}
          onEdit={(task) => {
            const current = sync.current(task);
            setTasks((previous) => reconcileTasks(previous, [current]));
            taskDetail.closeTaskDetail();
            setAction({ kind: "edit", taskId: task.id });
          }}
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

export default function ProjectWorkspace(props: ProjectWorkspaceProps) {
  return <TaskSyncProvider projectId={props.projectId}><ProjectWorkspaceContent {...props} /></TaskSyncProvider>;
}
