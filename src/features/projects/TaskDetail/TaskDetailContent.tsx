import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project, ProjectCatalogs, Task, TaskIdentity } from "../types";
import Modal from "../Modal/Modal";
import TaskDetailProperties, { TaskTitle } from "./TaskDetailProperties";
import TaskSubtasks from "./TaskSubtasks";
import TaskActivity from "./TaskActivity";
import TaskRelations from "./TaskRelations";
import { useTaskDetail } from "./useTaskDetail";
import { formatActivityDate } from "./detailFormat";
import Tooltip from "../../../shared/Tooltip";

export interface TaskDetailProps {
  version?: number;
  target: TaskIdentity;
  project: Project;
  catalogs: ProjectCatalogs;
  onUpdated: (task: Task) => void;
  onNavigate: (target: TaskIdentity) => void;
  onClose: () => void;
}

function DetailContent({
  target,
  project,
  catalogs,
  onUpdated,
  onNavigate,
  onClose,
  onBusy,
  activityVisible,
  onActivityToggle,
  version,
}: TaskDetailProps & {
  onBusy: (busy: boolean) => void;
  activityVisible: boolean;
  onActivityToggle: () => void;
}) {
  const model = useTaskDetail(target, onUpdated, version);
  const [quickBusy, setQuickBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const activityId = "task-detail-activity";
  const task = model.detail.value?.task,
    parent = model.detail.value?.parent;
  const busy = model.busy || quickBusy;
  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  useLayoutEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, []);
  function navigate(identity: TaskIdentity) {
    if (!busy) onNavigate(identity);
  }
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-5 py-3 text-xs max-sm:px-3">
        <nav aria-label="Ubicación de la tarea" className="min-w-0 flex-1">
          <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-neutral-700">
            {project.areas.map((area) => (
              <li key={area.id} className="break-words">
                {area.name}
              </li>
            ))}
            <li aria-hidden="true">/</li>
            <li className="break-words ">{project.name}</li>
            <li aria-hidden="true">/</li>
            <li>Tareas</li>
          </ol>
        </nav>
        {task && (
          <time
            dateTime={task.created_at}
            className="text-xs text-neutral-600 max-sm:order-3 max-sm:basis-full"
          >
            Creado el {formatActivityDate(task.created_at)}
          </time>
        )}
        <button
          type="button"
          aria-label="Cerrar detalle de tarea"
          disabled={busy}
          className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-lg text-neutral-700 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div
        className={`grid min-h-0 min-w-0 flex-1 max-md:flex max-md:flex-col max-md:overflow-y-auto ${activityVisible ? "lg:grid-cols-3" : "grid-cols-1"}`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-col max-md:block max-md:shrink-0 ${activityVisible ? "lg:col-span-2" : ""}`}
        >
          <div className="flex justify-end px-3 pt-2 pb-1">
            <Tooltip
              label={
                activityVisible ? "Ocultar actividad" : "Mostrar actividad"
              }
              portalTarget="dialog"
            >
              {(description) => (
                <button
                  ref={toggle}
                  type="button"
                  aria-label={
                    activityVisible ? "Ocultar actividad" : "Mostrar actividad"
                  }
                  aria-expanded={activityVisible}
                  aria-controls={activityId}
                  aria-describedby={description}
                  className="cursor-pointer touch-manipulation rounded-lg border border-transparent p-2 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                  onClick={() => {
                    if (
                      document
                        .getElementById(activityId)
                        ?.contains(document.activeElement)
                    )
                      toggle.current?.focus({ preventScroll: true });
                    onActivityToggle();
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d={
                        activityVisible
                          ? "m5 3 5 5-5 5M10 3l5 5-5 5"
                          : "m11 3-5 5 5 5M6 3 1 8l5 5"
                      }
                    />
                  </svg>
                </button>
              )}
            </Tooltip>
          </div>
          <div
            ref={panel}
            tabIndex={-1}
            aria-label="Información de la tarea"
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-7 focus-visible:outline-2 max-md:overflow-visible max-sm:px-4 lg:px-10"
          >
            {model.detail.loading && (
              <p role="status" className="text-xs text-neutral-600">
                Cargando tarea…
              </p>
            )}
            {model.detail.error && (
              <p role="alert" className="text-xs text-red-700">
                {model.detail.error}{" "}
                <button
                  type="button"
                  className="cursor-pointer underline"
                  onClick={() => {
                    void model.detail.refresh();
                  }}
                >
                  Reintentar
                </button>
              </p>
            )}
            {task && (
              <>
                {parent && (
                  <p className="mb-4 mt-0 text-xs text-neutral-600">
                    Subtarea de{" "}
                    <button
                      type="button"
                      className="cursor-pointer break-words rounded-lg px-1 text-neutral-800 hover:underline"
                      disabled={busy}
                      onClick={() =>
                        navigate({
                          projectId: target.projectId,
                          taskId: parent.id,
                        })
                      }
                    >
                      {parent.name}
                    </button>
                  </p>
                )}
                <TaskTitle
                  task={task}
                  onPatch={model.onPatch}
                  disabled={busy}
                />
                <TaskDetailProperties
                  task={task}
                  project={project}
                  catalogs={catalogs}
                  parent={parent ?? undefined}
                  onPatch={model.onPatch}
                  onState={model.onState}
                />
                {task.description && (
                  <p className="my-5 whitespace-pre-wrap break-words text-sm text-neutral-700">
                    {task.description}
                  </p>
                )}
                <TaskSubtasks
                  target={target}
                  task={task}
                  project={project}
                  catalogs={catalogs}
                  page={model.children.value}
                  loading={model.children.loading}
                  error={model.children.error}
                  retry={() => {
                    void model.children.refresh();
                  }}
                  onNavigate={navigate}
                  onCreated={(saved) => {
                    void model.accept(saved);
                  }}
                  onBusyChange={setQuickBusy}
                  moreBusy={model.children.moreBusy}
                  loadMore={model.children.loadMore}
                />
                <TaskRelations
                  target={target}
                  task={task}
                  page={model.relations.value}
                  loading={model.relations.loading}
                  error={model.relations.error}
                  retry={() => {
                    void model.relations.refresh();
                  }}
                  moreBusy={model.relations.moreBusy}
                  loadMore={model.relations.loadMore}
                  onChanged={model.relationsChanged}
                  onNavigate={navigate}
                />
              </>
            )}
          </div>
        </div>
        <TaskActivity
          id={activityId}
          visible={activityVisible}
          page={model.activity.value}
          loading={model.activity.loading}
          error={model.activity.error}
          retry={() => {
            void model.activity.refresh();
          }}
          moreBusy={model.activity.moreBusy}
          loadMore={model.activity.loadMore}
        />
      </div>
    </>
  );
}

export default function TaskDetailContent(props: TaskDetailProps) {
  const [busy, setBusy] = useState(false);
  const [activityVisible, setActivityVisible] = useState(true);
  return (
    <Modal
      title="Detalle de tarea"
      taskDetail
      busy={busy}
      onClose={props.onClose}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
        <DetailContent
          key={`${props.target.projectId}:${props.target.taskId}`}
          {...props}
          onBusy={setBusy}
          activityVisible={activityVisible}
          onActivityToggle={() => setActivityVisible((visible) => !visible)}
        />
      </div>
    </Modal>
  );
}
