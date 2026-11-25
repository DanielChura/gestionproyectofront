import { useState } from "react";
import TaskActivityFeed from "./TaskActivityFeed";
import TaskDetailFrame from "./TaskDetailFrame";
import TaskDetailSkeleton from "./TaskDetailSkeleton";
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

      {model.loading || !task ? (
        <TaskDetailSkeleton />
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden divide-x divide-neutral-200 dark:divide-neutral-800 max-md:flex-col max-md:divide-x-0 max-md:divide-y">
          <div
            key={target.taskId}
            className="flex-3 min-w-0 space-y-4 overflow-y-auto p-6"
          >
            {model.gantt && task.permissions.edit && (
              <button
                type="button"
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
              onChange={(e) => setDraft({ id: task.id, value: e.target.value })}
              onBlur={handleDescriptionBlur}
              placeholder="Añadir una descripción…"
              className="w-full resize-none rounded-md border border-neutral-200 bg-transparent p-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500"
            />

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
                className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
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
          </div>

          <div className="flex-2 min-w-0 flex flex-col max-md:max-h-72">
            <TaskActivityFeed activities={activities} />
            {model.moreActivity && (
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={model.loadingActivity}
                  className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  onClick={() => void model.loadActivity()}
                >
                  Cargar más actividad
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </TaskDetailFrame>
  );
}
