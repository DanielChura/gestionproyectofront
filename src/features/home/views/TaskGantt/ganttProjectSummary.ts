import type { Project, Task } from "../../types";

export function ganttProjectSummary(project: Project, tasks: Task[]) {
  const states = project.task_states?.states ?? [];
  const categories = new Map(
    states.map((state) => [state.code, state.category]),
  );
  const finished = tasks.filter((task) =>
    ["done", "closed"].includes(
      categories.get(task.state_code) ?? task.state_category ?? "",
    ),
  ).length;
  const percent = tasks.length
    ? Math.round((finished / tasks.length) * 10000) / 100
    : null;
  const starts = tasks
    .map((task) => task.start_date)
    .filter(Boolean)
    .sort();
  const ends = tasks
    .map((task) => task.due_date)
    .filter((date): date is string => date !== null)
    .sort();
  const start = project.start_date ?? starts[0] ?? null;
  const end = project.end_date ?? ends.at(-1) ?? null;
  const scope = `${finished} de ${tasks.length} tareas autorizadas, incluidos padres y subtareas, en categorías finalizadas (done/closed). Fórmula oficial de Resumen, independiente de filtros y contracciones.`;
  const range = `Inicio de ${project.start_date ? "proyecto" : "tareas autorizadas"}; fin de ${project.end_date ? "proyecto" : "tareas autorizadas"}.`;
  return {
    percent,
    start,
    end,
    reliable: Boolean(start && end && start <= end),
    tooltip: scope + " " + range,
  };
}
