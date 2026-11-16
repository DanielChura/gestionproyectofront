import type { useGanttVerticalScroll } from "./useGanttVerticalScroll";

export default function GanttVerticalNavigation({
  model,
}: {
  model: ReturnType<typeof useGanttVerticalScroll>;
}) {
  if (!model.maximum) return null;
  return (
    <nav
      aria-label="Desplazamiento vertical del Gantt"
      className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-6 flex-col justify-between"
    >
      <button
        type="button"
        aria-label="Subir filas de Gantt"
        disabled={model.top <= 0}
        onClick={() => model.step(-1)}
        className="pointer-events-auto grid size-6 cursor-pointer place-items-center rounded text-xs text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 disabled:cursor-default disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <span aria-hidden="true">▴</span>
      </button>
      <button
        type="button"
        aria-label="Bajar filas de Gantt"
        disabled={model.top >= model.maximum}
        onClick={() => model.step(1)}
        className="pointer-events-auto grid size-6 cursor-pointer place-items-center rounded text-xs text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 disabled:cursor-default disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <span aria-hidden="true">▾</span>
      </button>
    </nav>
  );
}
