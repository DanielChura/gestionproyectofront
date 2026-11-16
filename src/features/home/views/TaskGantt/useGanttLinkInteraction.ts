import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { GanttLinkRoute, RoutePoint, RouteObstacle } from "./ganttDependencyRouting";
import { ganttRouteSegments } from "./ganttRouteSegments";
import { closestGanttLink, ganttLinkActionPoint } from "./ganttLinkInteraction";

type ActiveLink = { id: string; point: RoutePoint; keyboard?: boolean } | null;
export function useGanttLinkInteraction(routes: GanttLinkRoute[], svg: RefObject<SVGSVGElement | null>, obstacles: RouteObstacle[], width: number, height: number) {
  const geometry = useMemo(() => routes.map(route => ({ ...route, segments: ganttRouteSegments(route.points) })), [routes]);
  const [active, setActive] = useState<ActiveLink>(null), selection = useRef<ActiveLink>(null);
  const latest = useRef({ geometry, obstacles, width, height });
  useLayoutEffect(() => { latest.current = { geometry, obstacles, width, height }; });
  function publish(value: ActiveLink) {
    const previous = selection.current;
    if (previous?.id === value?.id && previous?.keyboard === value?.keyboard && (!value || previous && Math.hypot(value.point.x - previous.point.x, value.point.y - previous.point.y) < .5)) return;
    selection.current = value; setActive(value);
  }
  useEffect(() => {
    const node = svg.current, host = node?.closest(".gm-task-gantt");
    if (!node || !host) return;
    let frame = 0;
    const move = (event: Event) => {
      const pointer = event as PointerEvent, target = pointer.target;
      if (!(target instanceof Element)) return;
      cancelAnimationFrame(frame);
      if (target.closest(`[data-remove-link="${selection.current?.id}"]`)) return;
      if (!target.closest("[data-gantt-link-hit],[data-gantt-link]")) {
        if (!selection.current?.keyboard) publish(null);
        return;
      }
      const x = pointer.clientX, y = pointer.clientY;
      frame = requestAnimationFrame(() => {
        const bounds = node.getBoundingClientRect(), model = latest.current;
        const found = closestGanttLink(model.geometry, { x: x - bounds.left, y: y - bounds.top }, selection.current?.id);
        const point = found && ganttLinkActionPoint(found.point, model.obstacles, model.width, model.height);
        publish(found && point ? { id: found.route.edge.id, point } : null);
      });
    };
    const leave = () => { cancelAnimationFrame(frame); if (!selection.current?.keyboard) publish(null); };
    host.addEventListener("pointermove", move, true); host.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(frame); host.removeEventListener("pointermove", move, true); host.removeEventListener("pointerleave", leave); };
  }, [svg]);
  function focus(route: GanttLinkRoute) {
    const model = latest.current, point = ganttLinkActionPoint(route.action, model.obstacles, model.width, model.height);
    if (point) publish({ id: route.edge.id, point, keyboard: true });
  }
  function blur(next: EventTarget | null) {
    if (!(next instanceof Element) || !next.closest("[data-remove-link],[data-gantt-link]")) publish(null);
  }
  return { active, focus, blur, clear: () => publish(null) };
}
