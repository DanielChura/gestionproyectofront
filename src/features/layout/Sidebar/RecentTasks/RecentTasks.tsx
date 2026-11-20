import { Link } from "react-router";
import { useProjectTasks } from "../../../home/hooks/useProjectTasks";
import RecentTasksSkeleton from "./RecentTasksSkeleton";
import { getIcon } from "../../../../shared/icons/icon-catalog";
import {
  categoryValue,
  stateCategories,
} from "../../../home/utils/stateGroups";
import { projectPath } from "../../../../routes";

interface RecentTasksProps {
  projectId: number;
}

export default function RecentTasks({ projectId }: RecentTasksProps) {
  const { tasks, loading } = useProjectTasks(projectId);
  const recentTasks = tasks.slice(0, 6);

  if (loading) return <RecentTasksSkeleton />;

  if (recentTasks.length === 0) {
    return (
      <p className="m-0 px-3 py-1 text-xs text-neutral-400 dark:text-neutral-500">
        Sin tareas recientes
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {recentTasks.map((task) => {
        const Icon = getIcon(task.state_tema?.icono);
        const tone =
          task.state_tema?.color ??
          task.state_color ??
          (task.state_code === "CANCELADA" || task.state_name === "CANCELADA"
            ? "#a42a28"
            : stateCategories.find(
                (item) =>
                  item.value ===
                  categoryValue({
                    code: task.state_code,
                    category: task.state_category,
                  }),
              )?.color);

        return (
          <li key={task.id}>
            <Link
              to={`${projectPath(projectId)}?tarea=${task.id}`}
              title={task.name}
              className="badge"
            >
              <span
                className="inline-flex shrink-0"
                style={tone ? { color: tone } : undefined}
              >
                <Icon className="size-4" fill />
              </span>
              <span className="min-w-0 flex-1 truncate">{task.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
