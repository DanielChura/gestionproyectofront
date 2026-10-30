import type { Task } from "../types";
import { taskAssignees } from "../taskAssignees";
import { taskMatchesSearch } from "../TaskList/taskHierarchy";
import { taskDueGroup } from "../TaskList/taskGrouping";

export interface GanttFilters {
  search: string;
  state: string;
  assignee: string;
  due: string;
}

export const emptyGanttFilters: GanttFilters = { search: "", state: "", assignee: "", due: "" };

export function hasGanttFilters(filters: GanttFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== "");
}

export function ganttProjection(tasks: Task[], filters: GanttFilters, today: string) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const matches = new Set<number>();
  const visible = new Set<number>();
  for (const task of tasks) {
    if (!taskMatchesSearch(task, filters.search)
      || filters.state && task.state_code !== filters.state
      || filters.assignee === "none" && taskAssignees(task).length > 0
      || filters.assignee && filters.assignee !== "none" && !taskAssignees(task).some((person) => String(person.id) === filters.assignee)
      || filters.due && taskDueGroup(task, today).key !== filters.due) continue;
    matches.add(task.id);
    let current: Task | undefined = task;
    while (current && !visible.has(current.id)) {
      visible.add(current.id);
      current = current.parent_id === null ? undefined : byId.get(current.parent_id);
    }
  }
  return { tasks: tasks.filter((task) => visible.has(task.id)), matches, visible };
}

export interface GanttDependency {
  id: string;
  predecessor: Task;
  successor: Task;
}

export function ganttDependencies(tasks: Task[]): GanttDependency[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const edges = new Map<string, GanttDependency>();
  for (const successor of tasks) for (const id of successor.dependencies) {
    const predecessor = byId.get(id);
    if (!predecessor || predecessor.id === successor.id) continue;
    const key = `${id}:${successor.id}`;
    edges.set(key, { id: key, predecessor, successor });
  }
  return [...edges.values()];
}
