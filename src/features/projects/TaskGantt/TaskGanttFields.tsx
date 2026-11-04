import { useLayoutEffect, useRef, useState } from "react";
import type { useGanttLayout } from "./useGanttLayout";
import { ganttColumnChoices } from "./useGanttLayout";
import XIcon from "../../../shared/icons/XIcon";
import { GanttIconButton, ganttControl } from "./GanttControl";

export default function TaskGanttFields({ layout, onClose, overlay }: {
  layout: Pick<ReturnType<typeof useGanttLayout>, "visible" | "toggle">; onClose: () => void;
  overlay: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const [search, setSearch] = useState("");
  const fields = [{ id: "text", label: "Tarea" }, ...ganttColumnChoices].filter(field => field.label.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")));
  useLayoutEffect(() => {
    panel.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, []);
  return <aside id="gantt-fields-panel" ref={panel} role="dialog" data-overlay={overlay || undefined} aria-labelledby="gantt-fields-title"
    className="gm-gantt-fields flex min-w-0 flex-col gap-3 border-l border-neutral-200 bg-white p-3 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
    onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    }}>
    <div className="flex items-center justify-between gap-2">
      <h3 id="gantt-fields-title" className="m-0 text-sm font-medium">Campos</h3>
      <GanttIconButton label="Cerrar campos" onClick={onClose}><XIcon className="size-4" /></GanttIconButton>
    </div>
    <label className="sr-only" htmlFor="gantt-field-search">Buscar campos de tarea</label>
    <input id="gantt-field-search" name="gantt_field_search" type="search" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)}
      placeholder="Buscar campos de tarea…" className="min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs placeholder:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder:text-neutral-300" />
    <div className="grid gap-1 overflow-y-auto overscroll-contain">
      {fields.map(field => <button type="button" key={field.id} role="switch" aria-label={field.id === "text" ? "Tarea, siempre visible" : field.label} aria-checked={field.id === "text" || layout.visible.has(field.id)} disabled={field.id === "text"}
        className={ganttControl + " flex items-center justify-between gap-3 text-left"} onClick={() => layout.toggle(field.id)}>
        <span>{field.label}{field.id === "text" && <span className="sr-only">, siempre visible</span>}</span>
        <span aria-hidden="true" className={`inline-flex w-7 shrink-0 rounded-full border p-0.5 ${field.id === "text" || layout.visible.has(field.id) ? "border-neutral-700 bg-neutral-700 dark:border-neutral-300 dark:bg-neutral-300" : "border-neutral-400 bg-neutral-200 dark:bg-neutral-800"}`}>
          <span className={`size-2.5 rounded-full bg-white dark:bg-neutral-900 ${field.id === "text" || layout.visible.has(field.id) ? "translate-x-3" : ""}`} />
        </span>
      </button>)}
      {fields.length === 0 && <p role="status">No hay campos que coincidan.</p>}
    </div>
  </aside>;
}
