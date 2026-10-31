import { useMemo } from "react";
import type { ReactNode } from "react";
import type { useTaskGantt } from "./useTaskGantt";
import type { GanttScale } from "./ganttViewport";
import type { useGanttLayout } from "./useGanttLayout";
import { ganttColumnChoices } from "./useGanttLayout";
import TaskSearch from "../TaskList/TaskSearch";
import TaskProperty from "../TaskForm/TaskProperty";
import Tooltip from "../../../shared/Tooltip";
import ChevronLeftIcon from "../../../shared/icons/ChevronLeftIcon";
import ChevronRightIcon from "../../../shared/icons/ChevronRightIcon";
import SettingsIcon from "../../../shared/icons/SettingsIcon";
import CheckIcon from "../../../shared/icons/CheckIcon";
import SearchIcon from "../../../shared/icons/SearchIcon";

type Controls = ReturnType<typeof useTaskGantt>;
const control = "gm-gantt-control cursor-pointer rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-default disabled:opacity-50 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:outline-sky-300";

function IconButton({ label, children, disabled, onClick }: { label: string; children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <Tooltip label={label}>{description => <button type="button" aria-label={label} aria-describedby={description} disabled={disabled}
    onClick={onClick} className={control + " inline-flex items-center justify-center !p-1.5"}><span aria-hidden="true">{children}</span></button>}</Tooltip>;
}

export default function TaskGanttToolbar({ controls, layout, onRefresh, loading }: { controls: Controls; layout: Pick<ReturnType<typeof useGanttLayout>, "visible" | "toggle">; onRefresh: () => void; loading: boolean }) {
  const { filters, setFilters } = controls;
  const taskOptions = useMemo(() => controls.projection.tasks.map(task => <option key={task.id} value={task.id}>{task.name}</option>), [controls.projection.tasks]);
  return <div className="gm-gantt-controls flex flex-wrap items-center gap-1 border-b border-neutral-200 py-2 dark:border-neutral-700" role="group" aria-label="Consulta de Gantt">
    <label className="sr-only" htmlFor="gantt-scale">Escala de Gantt</label>
    <select id="gantt-scale" name="gantt_scale" value={controls.viewport.scale} onChange={event => controls.changeScale(event.target.value as GanttScale)} className={control}>
      <option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option>
    </select>
    <IconButton label="Anterior" onClick={() => controls.page(-1)}><ChevronLeftIcon className="size-4" /></IconButton>
    <button type="button" onClick={controls.goToday} className={control}>Hoy</button>
    <IconButton label="Siguiente" onClick={() => controls.page(1)}><ChevronRightIcon className="size-4" /></IconButton>
    <button type="button" aria-label="Ajustar proyecto" onClick={controls.fitProject} className={control}>Ajustar</button>
    <select aria-label="Localizar tarea" name="gantt_task" className={control + " max-w-44"}
      value={controls.selectedId ?? ""} onChange={event => { if (event.target.value) controls.locate(Number(event.target.value)); }}>
      <option value="">Localizar tarea…</option>{taskOptions}
    </select>
    <IconButton label="Localizar selección" onClick={() => { if (controls.selectedId !== null) controls.locate(controls.selectedId); }}
      disabled={controls.selectedId === null || !controls.projection.visible.has(controls.selectedId)}><SearchIcon className="size-4" /></IconButton>
    <IconButton label="Actualizar Gantt" onClick={onRefresh} disabled={loading}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5M19 12a7 7 0 0 0-12-5L4 10m1 2a7 7 0 0 0 12 5l3-3" /></svg>
    </IconButton>
    <TaskSearch value={filters.search} onChange={search => setFilters(current => ({ ...current, search }))} />
    <select aria-label="Filtrar Gantt por estado" name="gantt_state" className={control} value={filters.state} onChange={event => setFilters(current => ({ ...current, state: event.target.value }))}>
      <option value="">Todos los estados</option>{controls.states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
    <select aria-label="Filtrar Gantt por responsable" name="gantt_assignee" className={control + " max-w-44"} value={filters.assignee} onChange={event => setFilters(current => ({ ...current, assignee: event.target.value }))}>
      <option value="">Todas las personas</option><option value="none">Sin persona asignada</option>
      {controls.people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
    <select aria-label="Filtrar Gantt por fecha límite" name="gantt_due" className={control} value={filters.due} onChange={event => setFilters(current => ({ ...current, due: event.target.value }))}>
      <option value="">Todas las fechas</option><option value="overdue">Con atraso</option><option value="on-time">En plazo</option><option value="completed">Completadas</option><option value="undated">Sin fecha límite</option>
    </select>
    {controls.filtered && <button type="button" className={control} onClick={() => setFilters({ search: "", state: "", assignee: "", due: "" })}>Limpiar filtros</button>}
    <TaskProperty id="gantt-columns" label="Columnas de Gantt" value="" compact appearance="toolbar"
      triggerClassName={control + " inline-flex items-center gap-1.5"} content={<><span aria-hidden="true"><SettingsIcon className="size-4" /></span><span>Columnas</span></>}>
      {() => <div className="grid gap-1">
        <span className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300">Tarea siempre visible</span>
        {ganttColumnChoices.map(column => <button type="button" key={column.id} aria-pressed={layout.visible.has(column.id)}
          onClick={() => layout.toggle(column.id)} className={control + " flex items-center justify-between gap-3 text-left"}>
          <span>{column.label}</span><span aria-hidden="true" className={layout.visible.has(column.id) ? "" : "invisible"}><CheckIcon className="size-4" /></span>
        </button>)}
      </div>}
    </TaskProperty>
  </div>;
}
