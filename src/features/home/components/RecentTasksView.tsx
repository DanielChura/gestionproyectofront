import Input from "../../../shared/components/Input/Input";
import Button from "../../../shared/components/Button/Button";
import PlusIcon from "../../../shared/icons/PlusIcon";
import RecentTaskRow from "./RecentTaskRow";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import type { Task } from "../../../core/interfaces/task.interface";

interface RecentTasksViewProps {
  project: ProjectSummary | null;
  projects: ProjectSummary[];
  tasks: Task[];
  stats: { total: number; completed: number; pending: number };
  search: string;
  onSearch: (val: string) => void;
  onSelectProject: (id: number) => void;
  onCreateTask: () => void;
}

export default function RecentTasksView({
  project,
  projects,
  tasks,
  stats,
  search,
  onSearch,
  onSelectProject,
  onCreateTask,
}: RecentTasksViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div>
          <h1 className="m-0 text-lg  text-neutral-900 dark:text-neutral-100">
            Últimas tareas
          </h1>
          <p className="m-0 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Proyecto activo: {project?.name ?? "Ningún proyecto"} ·{" "}
            {stats.pending} pendientes de {stats.total}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 1 && (
            <select
              value={project?.id ?? ""}
              onChange={(e) => onSelectProject(Number(e.target.value))}
              className="cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs  text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Button
            type="button"
            onClick={onCreateTask}
            className="inline-flex items-center gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            Nueva tarea
          </Button>
        </div>
      </header>

      <div className="w-full max-w-xs">
        <Input
          placeholder="Buscar tareas..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-left">
          <thead className="border-b border-neutral-200 bg-neutral-50/50 text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2 ">Nombre</th>
              <th className="px-3 py-2 ">Estado</th>
              <th className="px-3 py-2 ">Prioridad</th>
              <th className="px-3 py-2 ">Responsable</th>
              <th className="px-3 py-2 ">Fecha límite</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-xs text-neutral-500 dark:text-neutral-400"
                >
                  No hay tareas registradas para este proyecto.
                </td>
              </tr>
            ) : (
              tasks.map((task) => <RecentTaskRow key={task.id} task={task} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
