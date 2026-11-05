import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { useTaskGantt } from "./useTaskGantt";
import TaskSearch from "../TaskList/TaskSearch";
import TaskProperty from "../TaskForm/TaskProperty";
import SettingsIcon from "../../../shared/icons/SettingsIcon";
import TaskGanttPeriod from "./TaskGanttPeriod";
import { GanttIconButton, ganttControl } from "./GanttControl";

type Controls = ReturnType<typeof useTaskGantt>;

export default function TaskGanttToolbar({ controls, onRefresh, loading, createAction }: {
  controls: Controls; onRefresh: () => void; loading: boolean; createAction?: ReactNode;
}) {
  const { filters, setFilters } = controls;
  const refreshPending = useRef(false);
  useEffect(() => { if (!loading) refreshPending.current = false; }, [loading]);
  const active = Number(Boolean(filters.state)) + Number(Boolean(filters.assignee)) + Number(Boolean(filters.due));
  return <div className="gm-gantt-controls flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-neutral-200 py-2 dark:border-neutral-700" role="group" aria-label="Consulta de Gantt">
    <div className="gm-gantt-toolbar-time flex shrink-0 items-center gap-1">
      <TaskGanttPeriod controls={controls} />
      <button type="button" onClick={controls.goToday} className={ganttControl}>Hoy</button>
      <button type="button" onClick={controls.fitProject} className={ganttControl}>Ajuste automático</button>
    </div>
    <div className="gm-gantt-toolbar-actions ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
      <GanttIconButton label="Actualizar Gantt" aria-busy={loading} disabled={loading} onClick={() => {
        if (loading || refreshPending.current) return;
        refreshPending.current = true; onRefresh();
      }}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5M19 12a7 7 0 0 0-12-5L4 10m1 2a7 7 0 0 0 12 5l3-3" /></svg>
      </GanttIconButton>
      <div className="gm-gantt-search min-w-0"><TaskSearch value={filters.search} onChange={search => setFilters(current => ({ ...current, search }))} /></div>
      <TaskProperty id="gantt-filters" label="Filtros de Gantt" value={active ? `${active} activos` : "Sin filtros"} compact appearance="toolbar" selected={active > 0}
        triggerClassName={ganttControl + " inline-flex items-center gap-1.5"}
        content={<><span aria-hidden="true"><SettingsIcon className="size-4" /></span>{active > 0 && <span className="text-[10px] tabular-nums">{active}</span>}</>}>
        {() => <div className="gm-gantt-filter-panel grid gap-3">
          <span className="text-xs font-medium">Filtros</span>
          <div><label htmlFor="gantt-filter-state">Estado</label>
            <select id="gantt-filter-state" name="gantt_state" value={filters.state} onChange={event => setFilters(current => ({ ...current, state: event.target.value }))}>
              <option value="">Todos los estados</option>{controls.states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
          <div><label htmlFor="gantt-filter-assignee">Persona</label>
            <select id="gantt-filter-assignee" name="gantt_assignee" value={filters.assignee} onChange={event => setFilters(current => ({ ...current, assignee: event.target.value }))}>
              <option value="">Todas las personas</option><option value="none">Sin persona asignada</option>
              {controls.people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </div>
          <div><label htmlFor="gantt-filter-due">Fecha</label>
            <select id="gantt-filter-due" name="gantt_due" value={filters.due} onChange={event => setFilters(current => ({ ...current, due: event.target.value }))}>
              <option value="">Todas las fechas</option><option value="overdue">Con atraso</option><option value="on-time">En plazo</option><option value="completed">Completadas</option><option value="undated">Sin fecha límite</option>
            </select>
          </div>
          <button type="button" disabled={active === 0} className={ganttControl + " border-t border-neutral-200 dark:border-neutral-700"}
            onClick={() => setFilters(current => ({ ...current, state: "", assignee: "", due: "" }))}>Limpiar filtros</button>
        </div>}
      </TaskProperty>
      {createAction}
    </div>
  </div>;
}
