export interface PriorityConfig {
  code: number;
  label: string;
  badgeClass: string;
}

export const TASK_PRIORITIES: Record<number, PriorityConfig> = {
  1: {
    code: 1,
    label: "Urgente",
    badgeClass:
      "text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-900",
  },
  2: {
    code: 2,
    label: "Alta",
    badgeClass:
      "text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  },
  3: {
    code: 3,
    label: "Normal",
    badgeClass:
      "text-sky-700 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400 border-sky-200 dark:border-sky-900",
  },
  4: {
    code: 4,
    label: "Baja",
    badgeClass:
      "text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
  },
};

export function getPriority(code?: number | null): PriorityConfig {
  return (
    (code ? TASK_PRIORITIES[code] : undefined) ?? {
      code: 0,
      label: "Sin prioridad",
      badgeClass:
        "text-neutral-500 bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
    }
  );
}
