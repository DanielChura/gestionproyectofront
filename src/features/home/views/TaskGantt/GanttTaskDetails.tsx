import Modal from "../../../../shared/components/Modal/Modal";
import TaskCell from "../../shared/TaskCell";
import type { Project, Task } from "../../types";
import type { useTaskView } from "../../hooks/useTaskView";
import GanttDialogActions from "./GanttDialogActions";

export default function GanttTaskDetails({
  task,
  project,
  view,
}: {
  task: Task;
  project: Project;
  view: ReturnType<typeof useTaskView>;
}) {
  return (
    <Modal
      title={task.name}
      onClose={() => view.setAction(null)}
      busy={view.busy}
    >
      <div className="grid gap-4 p-4 text-xs text-neutral-700 dark:text-neutral-200">
        <p className="m-0 whitespace-pre-wrap">
          {task.description || "Sin descripción"}
        </p>
        {(
          [
            "state_code",
            "responsible_id",
            "start_date",
            "due_date",
            "priority",
            "labels",
          ] as const
        ).map((field) => (
          <div key={field}>
            <TaskCell
              appearance="detail"
              field={field}
              task={task}
              project={project}
              catalogs={view.catalogs}
              onPatch={view.patchTask}
              onState={view.changeState}
            />
          </div>
        ))}
        {task.dependencies.length > 0 && (
          <p className="m-0">
            Predecesoras:{" "}
            {view.tasks
              .filter((item) => task.dependencies.includes(item.id))
              .map((item) => item.name)
              .join(", ") || "Sin tareas disponibles"}
          </p>
        )}
      </div>
      <GanttDialogActions task={task} view={view} busy={view.busy} />
    </Modal>
  );
}
