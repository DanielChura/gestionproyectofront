import type { Project } from "../../../../../core/interfaces/task.interface";

export function quickTaskState(
  project: Project,
  groupCode?: string,
  hasAssignees = false,
) {
  const states = project.task_states.states;
  const initial = states.find(
    (state) =>
      state.category === "not_started" ||
      (!state.category && state.code === "PENDIENTE"),
  );
  const group = states.find((state) => state.code === groupCode);
  if (!group || !project.permissions.manage) return initial;
  if (group.code === "BLOQUEADA" || group.code === "CANCELADA") return initial;
  return group.category === "not_started" ||
    group.code === "PENDIENTE" ||
    group.code === "OBSERVADA" ||
    hasAssignees
    ? group
    : initial;
}

