import { useState, useEffect } from "react";
import TaskActivityFeed from "./TaskActivityFeed";
import TaskHeader from "./TaskHeader";
import TaskPropertiesGrid from "./TaskPropertiesGrid";
import TaskSubtasksList from "./TaskSubtasksList";
import TaskTitle from "./TaskTitle";
import type { useTaskDetail } from "./useTaskDetail";
import type { Project, ProjectCatalogs, TaskIdentity } from "../../types";

export type TaskDetailModel = ReturnType<typeof useTaskDetail> & {
  target: TaskIdentity;
  project: Project;
  catalogs: ProjectCatalogs;
  onNavigate: (target: TaskIdentity) => void;
  onClose: () => void;
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

  const [description, setDescription] = useState(task?.description ?? "");

  useEffect(() => {
    setDescription(task?.description ?? "");
  }, [task?.description]);

  async function handleDescriptionBlur() {
    const trimmed = description.trim();
    if (trimmed !== (task?.description ?? "").trim()) {
      await patchTask({ description: trimmed });
    }
  }

  return (
    <div className="bg-modal fixed inset-0 z-50 flex items-center justify-center">
      <dialog
        open
        className="m-auto flex h-[660px] w-[1140px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900 p-0 text-inherit dark:border-neutral-800"
      >
        <div className="flex size-full flex-col bg-neutral-950/50">
          <TaskHeader
            projectName={project.name}
            parentName={parent?.name}
            onNavigateParent={() =>
              parent &&
              onNavigate({ projectId: target.projectId, taskId: parent.id })
            }
            onClose={onClose}
          />

          <div className="flex flex-1 overflow-hidden">
            <div
              key={target.taskId}
              className="flex-1 space-y-4 overflow-y-auto p-6"
            >
              {task && (
                <>
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Añadir una descripción..."
                    className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent p-2.5 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500"
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
                </>
              )}
            </div>

            <div className="w-[420px] shrink-0">
              <TaskActivityFeed activities={activities} />
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
