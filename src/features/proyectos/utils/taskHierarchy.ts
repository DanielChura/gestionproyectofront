import type { Task } from "../../../core/interfaces/task.interface";

export function taskHierarchy(tasks: Task[], search = "") {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const children = new Map<number, Task[]>();
  const roots: Task[] = [];
  for (const task of byId.values()) {
    if (task.parent_id !== null && byId.has(task.parent_id)) {
      const branch = children.get(task.parent_id) ?? [];
      branch.push(task);
      children.set(task.parent_id, branch);
    } else {
      roots.push(task);
    }
  }
  const query = search.trim().toLocaleLowerCase("es");
  const visible = new Set<number>();
  for (const task of byId.values()) {
    if (
      query &&
      ![
        task.name,
        task.responsible_name ?? "",
        ...(task.assignees ?? []).map((person) => person.name),
        ...task.labels.map((label) => label.name),
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(query)
    ) {
      continue;
    }
    let current: Task | undefined = task;
    while (current && !visible.has(current.id)) {
      visible.add(current.id);
      current = current.parent_id === null ? undefined : byId.get(current.parent_id);
    }
  }
  function descendants(
    id: number,
    visited = new Set<number>(),
    allowed = visible,
  ): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    return (children.get(id) ?? [])
      .filter((task) => allowed.has(task.id))
      .reduce(
        (count, task) => count + 1 + descendants(task.id, visited, allowed),
        0,
      );
  }
  return {
    roots: roots.filter((task) => visible.has(task.id)),
    children,
    visible,
    descendants,
  };
}

export function formatTaskDate(value: string | null | undefined): string {
  return value
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }).format(new Date(`${value}T12:00:00`))
    : "Sin fecha";
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es");
}

