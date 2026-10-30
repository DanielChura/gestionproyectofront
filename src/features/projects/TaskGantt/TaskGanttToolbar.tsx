import type { useTaskGantt } from "./useTaskGantt";
import type { GanttScale } from "./ganttViewport";
import TaskSearch from "../TaskList/TaskSearch";

type Controls = ReturnType<typeof useTaskGantt>;
const control = "cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

export default function TaskGanttToolbar({ controls, onRefresh, loading }: { controls: Controls; onRefresh: () => void; loading: boolean }) {
  const { filters, setFilters } = controls;
  return <div className="gm-gantt-controls flex flex-wrap items-center gap-2 py-3" role="group" aria-label="Consulta de Gantt">
    <label className="sr-only" htmlFor="gantt-scale">Escala de Gantt</label>
    <select id="gantt-scale" name="gantt_scale" value={controls.viewport.scale} onChange={(event) => controls.changeScale(event.target.value as GanttScale)} className={control}>
      <option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option>
    </select>
    <button type="button" onClick={() => controls.page(-1)} className={control}>Anterior</button>
    <button type="button" onClick={controls.goToday} className={control}>Hoy</button>
    <button type="button" onClick={() => controls.page(1)} className={control}>Siguiente</button>
    <button type="button" onClick={controls.fitProject} className={control}>Ajustar proyecto</button>
    <select aria-label="Localizar tarea" name="gantt_task" className={control + " max-w-52"}
      value={controls.selectedId ?? ""} onChange={(event) => { if (event.target.value) controls.locate(Number(event.target.value)); }}>
      <option value="">Localizar tarea…</option>
      {controls.projection.tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
    </select>
    <button type="button" onClick={() => { if (controls.selectedId !== null) controls.locate(controls.selectedId); }}
      disabled={controls.selectedId === null || !controls.projection.visible.has(controls.selectedId)} className={control}>Localizar selección</button>
    <button type="button" onClick={onRefresh} disabled={loading} className={control}>Actualizar Gantt</button>
    <TaskSearch value={filters.search} onChange={(search) => setFilters((current) => ({ ...current, search }))} />
    <select aria-label="Filtrar Gantt por estado" name="gantt_state" className={control} value={filters.state} onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}>
      <option value="">Todos los estados</option>{controls.states.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
    <select aria-label="Filtrar Gantt por responsable" name="gantt_assignee" className={control + " max-w-52"} value={filters.assignee} onChange={(event) => setFilters((current) => ({ ...current, assignee: event.target.value }))}>
      <option value="">Todas las personas</option><option value="none">Sin persona asignada</option>
      {controls.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
    <select aria-label="Filtrar Gantt por fecha límite" name="gantt_due" className={control} value={filters.due} onChange={(event) => setFilters((current) => ({ ...current, due: event.target.value }))}>
      <option value="">Todas las fechas</option><option value="overdue">Con atraso</option><option value="on-time">En plazo</option><option value="completed">Completadas</option><option value="undated">Sin fecha límite</option>
    </select>
    {controls.filtered && <button type="button" className={control} onClick={() => setFilters({ search: "", state: "", assignee: "", due: "" })}>Limpiar filtros</button>}
  </div>;
}
