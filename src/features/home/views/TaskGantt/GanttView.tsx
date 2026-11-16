import type { Dispatch, SetStateAction } from "react";
import type { Project } from "../../types";
import { useTaskView } from "../../hooks/useTaskView";
import GanttTaskDialog from "./GanttTaskDialog";
import TaskGanttEntry from "./TaskGanttEntry";
import type { TaskGanttProps } from "./types";

export default function GanttView({
  project,
  onProjectChange,
  protection,
}: {
  project: Project;
  protection?: TaskGanttProps["protection"];
  onProjectChange: Dispatch<SetStateAction<Project | null>>;
}) {
  const view = useTaskView(project, onProjectChange);
  return (
    <>
      <TaskGanttEntry
        project={project}
        protection={protection}
        tasks={view.tasks}
        catalogs={view.catalogs}
        loading={view.loading}
        error={view.error}
        onRetry={view.refetch}
        createAction={
          project.permissions.create_tasks && (
            <button
              type="button"
              disabled={view.busy}
              onClick={() => view.setAction({ kind: "create" })}
              className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900! dark:hover:bg-neutral-200"
            >
              + Agregar tarea
            </button>
          )
        }
        onCreated={view.acceptTask}
        onMoved={view.replaceTasks}
        actionsDisabled={view.busy}
        onOpenTask={(taskId, section) =>
          view.setAction({
            kind: section === "relations" ? "dependencies" : "detail",
            taskId,
          })
        }
        onAction={(kind, taskId) => view.setAction({ kind, taskId })}
      />
      {view.action && (
        <GanttTaskDialog
          key={
            view.action.kind +
            ":" +
            ("taskId" in view.action ? view.action.taskId : "new")
          }
          project={project}
          view={view}
        />
      )}
    </>
  );
}
