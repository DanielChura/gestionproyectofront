import TaskAssigneeCell from "./columns/TaskAssigneeCell";
import TaskDueDateCell from "./columns/TaskDueDateCell";
import TaskPriorityCell from "./columns/TaskPriorityCell";
import TaskStartDateCell from "./columns/TaskStartDateCell";
import TaskStateCell from "./columns/TaskStateCell";
import TaskNameCell from "./TaskNameCell";
import type {
  TaskFieldView,
  TaskRowActions,
  TaskRowData,
  TaskRowModel,
} from "./types";

export default function TaskRow({
  row,
  data,
  actions,
}: {
  row: TaskRowModel;
  data: TaskRowData;
  actions: TaskRowActions;
}) {
  const { task } = row;
  const view: TaskFieldView = {
    task,
    parent: row.parent,
    project: data.project,
    catalogs: data.catalogs,
    ...data.changes,
  };

  return (
    <tr
      data-task-id={task.id}
      className="group/row h-12 border-b border-neutral-200 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
      onClick={(e) => {
        if (
          e.target instanceof Element &&
          !e.target.closest(
            "button, input, textarea, select, a, summary, [contenteditable=true]",
          )
        ) {
          actions.onOpen();
        }
      }}
    >
      <TaskNameCell
        row={row}
        projectName={data.project.name}
        onToggle={actions.onToggle}
        onOpen={actions.onOpen}
      />
      <TaskAssigneeCell view={view} />
      <TaskStartDateCell view={view} />
      <TaskDueDateCell view={view} />
      <TaskPriorityCell view={view} />
      <TaskStateCell view={view} />
    </tr>
  );
}
