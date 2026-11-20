import { useState } from "react";
import TaskActivityFeed from "./TaskActivityFeed";
import TaskDetailFrame from "./TaskDetailFrame";
import TaskHeader from "./TaskHeader";
import TaskRelations from "./TaskRelations";
import TaskPropertiesGrid from "./TaskPropertiesGrid";
import TaskSubtasksList from "./TaskSubtasksList";
import TaskTitle from "./TaskTitle";
import type { useTaskDetail } from "./useTaskDetail";
import type { Project, ProjectCatalogs, TaskIdentity } from "../../types";
export type TaskDetailModel = ReturnType<typeof useTaskDetail> & {
  target: TaskIdentity;
  gantt?: boolean;
  project: Project;
  catalogs: ProjectCatalogs;
  onNavigate: (target: TaskIdentity) => void;
  onClose: () => void;
  onEdit: () => void;
};
export default function TaskDetailModal({ model }: { model: TaskDetailModel }) {
  const {
    target,
    project,
    catalogs,
    task,
    parent,
    subtasks,
    subtasksSummary,
    activities,
    patchTask,
    onSubtaskCreated,
    onPatch,
    onState,
    onNavigate,
    onClose,
  } = model;
  const [draft, setDraft] = useState<{ id: number; value: string } | null>(
    null,
  );
  const description =
    draft && draft.id === task?.id ? draft.value : (task?.description ?? "");

  async function handleDescriptionBlur() {
    const trimmed = description.trim();
    if (trimmed !== (task?.description ?? "").trim()) {
      try {
        await patchTask({ description: trimmed });
        setDraft((current) => (current?.id === task?.id ? null : current));
      } catch {
        /* The hook reports the error and preserves the draft. */
      }
    }
  }
  const content = (
    <>
      {model.loading && (
        <p role="status" className="px-6 text-xs">
          Consultando tarea…
        </p>
      )}
      {model.error && (
        <p role="alert" className="px-6 text-xs">
          {model.error}{" "}
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => void model.retry()}
          >
            Reintentar
          </button>
        </p>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden max-md:flex-col">
        <div
          key={target.taskId}
          className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6"
        >
          {task && (
            <>
              {model.gantt && task.permissions.edit && (
                <button
                  type="button"
                  className="cursor-pointer rounded-md px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={model.onEdit}
                >
                  Editar datos
                </button>
              )}
              <TaskTitle
                task={task}
                subtasksCount={subtasksSummary.total}
                onPatch={patchTask}
              />
              <TaskPropertiesGrid
                task={task}
                parent={parent ?? undefined}
                project={project}
                catalogs={catalogs}
                onPatch={onPatch}
                onState={onState}
              />
              <textarea
                rows={3}
                aria-label="Descripción"
                readOnly={!project.permissions.manage || model.busy}
                value={description}
                onChange={(e) =>
                  task && setDraft({ id: task.id, value: e.target.value })
                }
                onBlur={handleDescriptionBlur}
                placeholder="Añadir una descripción..."
                className="w-full resize-none rounded-md border border-neutral-200 bg-transparent p-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500"
              />
              {model.childrenError && (
                <p role="alert">
                  {model.childrenError}{" "}
                  <button
                    type="button"
                    onClick={() => void model.retryChildren()}
                  >
                    Reintentar subtareas
                  </button>
                </p>
              )}
              <TaskSubtasksList
                tasks={subtasks}
                summary={subtasksSummary}
                projectId={target.projectId}
                project={project}
                catalogs={catalogs}
                parent={task}
                onNavigate={onNavigate}
                onSubtaskCreated={onSubtaskCreated}
              />
              {model.moreChildren && (
                <button
                  type="button"
                  disabled={model.loadingChildren}
                  className="cursor-pointer text-xs"
                  onClick={() => void model.loadChildren()}
                >
                  Cargar más subtareas
                </button>
              )}
              {model.gantt && (
                <TaskRelations
                  target={target}
                  task={task}
                  page={model.relations.value}
                  loading={model.relations.loading}
                  error={model.relations.error}
                  retry={model.relations.refresh}
                  moreBusy={model.relations.moreBusy}
                  loadMore={model.relations.loadMore}
                  onChanged={model.relationsChanged}
                  onNavigate={onNavigate}
                />
              )}
            </>
          )}
        </div>
        <div className="w-[420px] min-h-0 shrink-0 max-md:max-h-60 max-md:w-full">
          {model.activityError && (
            <p role="alert">
              {model.activityError}{" "}
              <button type="button" onClick={() => void model.retryActivity()}>
                Reintentar actividad
              </button>
            </p>
          )}
          <TaskActivityFeed activities={activities} />
          {model.moreActivity && (
            <button
              type="button"
              disabled={model.loadingActivity}
              className="cursor-pointer text-xs"
              onClick={() => void model.loadActivity()}
            >
              Cargar más actividad
            </button>
          )}
        </div>
      </div>
    </>
  );
  return (
    <TaskDetailFrame onClose={onClose}>
      <TaskHeader
        projectName={project.name}
        parentName={parent?.name}
        onNavigateParent={() =>
          parent &&
          onNavigate({ projectId: target.projectId, taskId: parent.id })
        }
        onClose={onClose}
      />
      {content}
    </TaskDetailFrame>
  );
}
