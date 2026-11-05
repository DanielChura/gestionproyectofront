import type {
  ProjectTaskState,
  StateCategory,
  TaskStatusTemplate,
} from "../../../../../core/interfaces/project.interface";
import { categoryValue, stateCategories } from "../../../utils/stateGroups";

export function newStateCode() {
  return `draft_${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`;
}

export function templateDraft(template: TaskStatusTemplate): ProjectTaskState[] {
  return template.states.map((state) => ({ ...state, code: newStateCode() }));
}

export function orderedDraft(states: ProjectTaskState[]) {
  return stateCategories.flatMap(({ value }) =>
    states.filter((state) => categoryValue(state) === value),
  );
}

export function draftError(states: ProjectTaskState[]): string {
  if (states.length > 50) return "El flujo admite hasta 50 estados.";
  if (
    states.some((state) => !state.name.trim() || state.name.trim().length > 70)
  ) {
    return "Usa nombres de 1 a 70 caracteres.";
  }
  if (
    new Set(
      states.map((state) => state.name.trim().toLocaleLowerCase("es")),
    ).size !== states.length
  ) {
    return "Ya existe un estado con ese nombre.";
  }
  return "";
}

export function moveState(
  states: ProjectTaskState[],
  code: string,
  destination: string,
): ProjectTaskState[] {
  const source = states.findIndex((state) => state.code === code);
  const target = states.findIndex((state) => state.code === destination);
  if (
    source < 0 ||
    target < 0 ||
    categoryValue(states[source]) !== categoryValue(states[target])
  ) {
    return states;
  }
  const next = [...states];
  next.splice(target, 0, ...next.splice(source, 1));
  return next;
}

export function templateStates(
  states: ProjectTaskState[],
): TaskStatusTemplate["states"] {
  return orderedDraft(states).map((state) => ({
    name: state.name.trim().toLocaleUpperCase("es"),
    category: categoryValue(state),
    color:
      state.color ??
      stateCategories.find((item) => item.value === categoryValue(state))!
        .color,
  }));
}

export function emptyState(category: StateCategory): ProjectTaskState {
  return {
    code: newStateCode(),
    name: "",
    category,
    color: stateCategories.find((item) => item.value === category)!.color,
  };
}

