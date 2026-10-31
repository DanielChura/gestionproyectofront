import type { GanttDependency } from "./ganttQuery";

interface Props {
  dependencies: GanttDependency[];
  selectedId: number | null;
  visible: Set<number>;
  onLocate: (id: number) => void;
}

export default function TaskGanttDependencies({ dependencies, selectedId, visible, onLocate }: Props) {
  const related = dependencies.filter((edge) => edge.predecessor.id === selectedId || edge.successor.id === selectedId);
  const shown = related.filter((edge) => visible.has(edge.predecessor.id) && visible.has(edge.successor.id));
  if (selectedId === null) return null;
  return <section aria-label="Dependencias de la tarea seleccionada" className="border-t border-neutral-200 py-3 text-xs text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
    <h3 className="m-0 text-xs font-medium text-neutral-800 dark:text-neutral-200">Dependencias</h3>
    {selectedId === null ? <p className="mb-0">Selecciona una tarea para consultar sus predecesoras y sucesoras.</p>
      : <>
        {shown.length === 0 && <p className="mb-0">Sin dependencias visibles para esta tarea.</p>}
        <ul className="m-0 grid list-none gap-1 p-0">
          {shown.map((edge) => <li key={edge.id} className="flex flex-wrap items-center gap-2 py-1">
            <button type="button" className="cursor-pointer rounded px-1 py-1 text-left underline hover:bg-neutral-100 focus-visible:outline-2 dark:hover:bg-neutral-800"
              onClick={() => onLocate(edge.predecessor.id)} aria-label={"Localizar predecesora " + edge.predecessor.name}>{edge.predecessor.name}</button>
            <span>precede a</span>
            <button type="button" className="cursor-pointer rounded px-1 py-1 text-left underline hover:bg-neutral-100 focus-visible:outline-2 dark:hover:bg-neutral-800"
              onClick={() => onLocate(edge.successor.id)} aria-label={"Localizar sucesora " + edge.successor.name}>{edge.successor.name}</button>
          </li>)}
        </ul>
        {related.length > shown.length && <p className="mb-0 text-neutral-600 dark:text-neutral-300">{related.length - shown.length} dependencias fuera de los filtros actuales.</p>}
      </>}
  </section>;
}
