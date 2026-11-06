import type {
  ProjectCatalogs,
  ProjectTaskState,
} from "../../../core/interfaces/project.interface";
import type {
  Task,
  TaskGroupingPreferences,
  TaskGroupToken,
  TaskListGroup,
} from "../../../core/interfaces/task.interface";
import { taskAssignees } from "./taskAssignees";
import type { taskHierarchy } from "./taskHierarchy";

const compareNames = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

export function projectToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function taskDueGroup(task: Task, today: string) {
  if (
    task.state_code !== "CANCELADA" &&
    (task.state_category === "done" ||
      task.state_category === "closed" ||
      (!task.state_category && task.state_code === "COMPLETADA"))
  ) {
    return { key: "completed", name: "Completadas", rank: 3 };
  }
  if (!task.due_date) {
    return { key: "undated", name: "Sin fecha límite", rank: 2 };
  }
  return task.due_date < today
    ? { key: "overdue", name: "Con atraso", rank: 0 }
    : { key: "on-time", name: "En plazo", rank: 1 };
}

export function groupTasks(
  tasks: Task[],
  hierarchy: ReturnType<typeof taskHierarchy>,
  preferences: TaskGroupingPreferences,
  states: ProjectTaskState[],
  priorities: ProjectCatalogs["priorities"],
  today: string,
): TaskListGroup[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const taskOrder = new Map(
    [...byId.keys()].map((id, position) => [id, position]),
  );
  const groups = new Map<string, TaskListGroup>();
  const stateByCode = new Map(
    states.map((state, rank) => [state.code, { ...state, rank }]),
  );
  const priorityByCode = new Map(
    priorities.map((priority, rank) => [priority.code, { ...priority, rank }]),
  );
  type Descriptor = Pick<
    TaskListGroup,
    "key" | "name" | "rank" | "tokens" | "stateCode" | "priority"
  >;

  if (preferences.mode === "state") {
    for (const state of stateByCode.values()) {
      const key = `state:${state.code}`;
      const color = state.tema?.color ?? "neutral-700";
      groups.set(key, {
        key,
        name: state.name,
        stateCode: state.code,
        stateCategory: state.category,
        stateColor: `var(--color-${color})`,
        rank: state.rank,
        tokens: [],
        members: new Set(),
        visible: new Set(),
        roots: [],
      });
    }
  }

  function tokenGroups(
    tokens: TaskGroupToken[],
    separate: boolean,
    empty: string,
  ): Descriptor[] {
    const unique = [
      ...new Map(tokens.map((token) => [token.id, token])).values(),
    ].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
    if (!unique.length) {
      return [{ key: "none", name: empty, rank: 0, tokens: [] }];
    }
    return (separate ? unique.map((token) => [token]) : [unique]).map(
      (items) => {
        const visible = [...items].sort(
          (left, right) =>
            compareNames.compare(left.name, right.name) ||
            compareNames.compare(left.id, right.id),
        );
        return {
          key: JSON.stringify(items.map((token) => token.id)),
          name: visible.map((token) => token.name).join(", "),
          tokens: visible,
          rank: 0,
        };
      },
    );
  }

  function descriptors(task: Task): Descriptor[] {
    switch (preferences.mode) {
      case "state": {
        const state = stateByCode.get(task.state_code);
        return [
          {
            key: task.state_code,
            name: state?.name ?? task.state_name,
            rank: state?.rank ?? states.length,
            stateCode: task.state_code,
            tokens: [],
          },
        ];
      }
      case "priority": {
        const priority =
          task.priority === null ? undefined : priorityByCode.get(task.priority);
        return [
          {
            key: task.priority == null ? "none" : String(task.priority),
            name:
              task.priority == null
                ? "Sin prioridad"
                : (priority?.name ?? `Prioridad ${task.priority}`),
            rank: priority?.rank ?? priorities.length,
            priority: task.priority ?? undefined,
            tokens: [],
          },
        ];
      }
      case "assignees":
        return tokenGroups(
          taskAssignees(task).map((person) => ({
            id: String(person.id),
            name: person.name,
          })),
          preferences.separatePeople,
          "Sin persona asignada",
        );
      case "labels":
        return tokenGroups(
          task.labels.map((label) => ({
            id:
              label.specialty_id != null
                ? `specialty:${label.specialty_id}`
                : label.requirement_id == null
                  ? `label:${label.id}`
                  : `requirement:${label.requirement_id}`,
            name: label.name,
          })),
          preferences.separateLabels,
          "Sin etiquetas",
        );
      case "due_date":
        return [{ ...taskDueGroup(task, today), tokens: [] }];
    }
  }

  for (const task of byId.values()) {
    if (!hierarchy.visible.has(task.id)) continue;
    for (const descriptor of descriptors(task)) {
      const key = `${preferences.mode}:${descriptor.key}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          ...descriptor,
          key,
          members: new Set(),
          visible: new Set(),
          roots: [],
        };
        groups.set(key, group);
      }
      group.members.add(task.id);
    }
  }
  for (const group of groups.values()) {
    for (const taskId of group.members) {
      let task = byId.get(taskId);
      while (task && !group.visible.has(task.id)) {
        group.visible.add(task.id);
        task = task.parent_id === null ? undefined : byId.get(task.parent_id);
      }
    }
    group.roots = [...group.visible]
      .flatMap((id) => {
        const task = byId.get(id);
        return task &&
          (task.parent_id === null || !group.visible.has(task.parent_id))
          ? [task]
          : [];
      })
      .sort(
        (left, right) =>
          taskOrder.get(left.id)! - taskOrder.get(right.id)!,
      );
  }
  const alphabetical =
    preferences.mode === "assignees" || preferences.mode === "labels";
  const direction = preferences.order === "desc" ? -1 : 1;
  return [...groups.values()].sort(
    (left, right) =>
      direction *
      ((alphabetical ? 0 : left.rank - right.rank) ||
        compareNames.compare(left.name, right.name) ||
        compareNames.compare(left.key, right.key)),
  );
}

