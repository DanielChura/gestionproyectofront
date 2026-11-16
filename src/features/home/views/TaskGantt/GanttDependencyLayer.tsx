import { useId, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import type { ConnectionRow } from "./useGanttConnection";
import type { GanttLinkRoute } from "./ganttDependencyRouting";
import { ganttLinkObstacles } from "./ganttLinkInteraction";
import { useGanttLinkInteraction } from "./useGanttLinkInteraction";

interface Model {
  routes: GanttLinkRoute[]; rows: ConnectionRow[]; width: number; height: number; header: number;
  activeTask: number | null; canRemove: boolean;
  onInspect: (source: number, target: number) => void;
  onRemove: (source: number, target: number) => void;
}
export default function GanttDependencyLayer({ model: m, children }: { model: Model; children?: ReactNode }) {
  const svg = useRef<SVGSVGElement>(null), id = useId().replaceAll(":", "");
  const obstacles = useMemo(() => ganttLinkObstacles(m.rows, m.activeTask, m.width), [m.rows, m.activeTask, m.width]);
  const interaction = useGanttLinkInteraction(m.routes, svg, obstacles, m.width, m.height);
  const permitted = useMemo(() => new Set(m.rows.filter(row => row.task.permissions.dependencies).map(row => row.task.id)), [m.rows]);
  const canRemove = (route: GanttLinkRoute) => m.canRemove && permitted.has(route.edge.predecessor.id) && permitted.has(route.edge.successor.id);
  const active = m.routes.find(route => route.edge.id === interaction.active?.id);
  return <>
    <svg ref={svg} className="gm-gantt-links" width={m.width} height={m.height} style={{ top: m.header }} aria-label="Dependencias: origen requisito y destino condicionado">
      <defs>
        <marker id={id} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8" fill="currentColor" stroke="none"/></marker>
        <clipPath id={id + "-hit"} clipPathUnits="userSpaceOnUse">
          <path clipRule="evenodd" d={`M0,0H${m.width}V${m.height}H0Z` + m.rows.filter(row => row.geometry.real).map(({ geometry: bar }) => {
            const left = Math.max(0, bar.displayLeft ?? 0), right = Math.min(m.width, bar.displayRight ?? 0), top = Math.max(0, bar.y - 12), bottom = Math.min(m.height, bar.y + 12);
            return right > left && bottom > top ? `M${left},${top}H${right}V${bottom}H${left}Z` : "";
          }).join("")}/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-hit)`}>{m.routes.map(route => <path key={route.edge.id} data-gantt-link-hit={route.edge.id} className="cursor-pointer" d={route.path} fill="none" stroke="transparent" strokeWidth="14" pointerEvents="stroke" aria-hidden="true" onClick={() => m.onInspect(route.edge.predecessor.id, route.edge.successor.id)}><title>{route.edge.predecessor.name} → {route.edge.successor.name} · {route.edge.type ?? "Legado informativo"}</title></path>)}</g>
      {m.routes.map(route => <path key={route.edge.id} data-gantt-link={route.edge.id} data-dependency-type={route.edge.type ?? "legacy"} className="gm-gantt-link pointer-events-none!" data-related={active === route || m.activeTask === route.edge.predecessor.id || m.activeTask === route.edge.successor.id || undefined} d={route.path} markerEnd={`url(#${id})`} role="button" tabIndex={0} aria-label={`${route.edge.predecessor.name} → ${route.edge.successor.name} · ${route.edge.type ?? "Legado informativo"}`} onFocus={() => interaction.focus(route)} onBlur={event => interaction.blur(event.relatedTarget)} onKeyDown={event => {
        if (canRemove(route) && ["Delete", "Backspace"].includes(event.key)) { event.preventDefault(); interaction.clear(); m.onRemove(route.edge.predecessor.id, route.edge.successor.id); }
        if (["Enter", " "].includes(event.key)) { event.preventDefault(); m.onInspect(route.edge.predecessor.id, route.edge.successor.id); }
      }}><title>{route.edge.predecessor.name} → {route.edge.successor.name} · {route.edge.type ?? "Legado informativo"}</title></path>)}
      {children}
    </svg>
    {active && interaction.active && canRemove(active) && <button type="button" data-remove-link={active.edge.id} aria-label={`Retirar dependencia ${active.edge.predecessor.name} → ${active.edge.successor.name} · ${active.edge.type ?? "Legado informativo"}`} className="gm-gantt-remove-link grid size-6 place-items-center border-0 p-0 text-sm focus-visible:outline-2" style={{ left: interaction.active.point.x - 12, top: m.header + interaction.active.point.y - 12 }} onBlur={event => interaction.blur(event.relatedTarget)} onClick={() => { interaction.clear(); m.onRemove(active.edge.predecessor.id, active.edge.successor.id); }}>×</button>}
  </>;
}
