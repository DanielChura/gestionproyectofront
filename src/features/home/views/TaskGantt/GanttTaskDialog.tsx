import type { Project } from "../../types";
import type { useTaskView } from "../../hooks/useTaskView";
import TaskDialog from "../../shared/task-form/TaskDialog";
export default function GanttTaskDialog({
  project,
  view,
}: {
  project: Project;
  view: ReturnType<typeof useTaskView>;
}) {
  return (
    <TaskDialog
      gantt
      controller={{ project, ...view, close: () => view.setAction(null) }}
      onUpdated={view.acceptTask}
    />
  );
}
