import type {
  ProjectTaskState,
  StateCategory,
} from "../../../core/interfaces/project.interface";

export const stateCategories: {
  value: StateCategory;
  label: string;
  help: string;
  color: string;
  icono: string;
}[] = [
  {
    value: "not_started",
    label: "No iniciado",
    help: "Pendiente de comenzar.",
    color: "#737373",
    icono: "minus",
  },
  {
    value: "active",
    label: "Activo",
    help: "Trabajo en desarrollo, aunque su nombre indique otra cosa.",
    color: "#2563eb",
    icono: "dot",
  },
  {
    value: "done",
    label: "Completado",
    help: "Trabajo terminado que puede requerir un paso final.",
    color: "#0d9488",
    icono: "check",
  },
  {
    value: "closed",
    label: "Cerrado",
    help: "Finalizado y fuera del flujo activo. No archiva la tarea.",
    color: "#26834a",
    icono: "lock",
  },
];

export function categoryValue(state: ProjectTaskState): StateCategory {
  return (
    state.category ??
    (state.code === "PENDIENTE"
      ? "not_started"
      : ["COMPLETADA", "CANCELADA"].includes(state.code)
        ? "closed"
        : "active")
  );
}

export function stateCategory(code: string, category?: StateCategory): string {
  return (
    stateCategories.find(
      (item) => item.value === categoryValue({ code, name: "", category }),
    )?.label ?? ""
  );
}

export function groupTaskStates(states: ProjectTaskState[]) {
  return stateCategories
    .map(({ value, label }) => ({
      label,
      states: states.filter((state) => categoryValue(state) === value),
    }))
    .filter((group) => group.states.length > 0);
}
