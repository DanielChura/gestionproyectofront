import type { ConnectionRow } from "./useGanttConnection";
import type {
  RoutePoint,
  RouteObstacle,
  GanttLinkRoute,
} from "./ganttDependencyRouting";
import type { GanttRouteSegment } from "./ganttRouteSegments";

export interface InteractiveGanttRoute extends GanttLinkRoute {
  segments: GanttRouteSegment[];
}
const squared = (a: RoutePoint, b: RoutePoint) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function nearestGanttRoutePoint(
  segments: GanttRouteSegment[],
  point: RoutePoint,
) {
  let nearest = { x: 0, y: 0 },
    distance = Infinity;
  for (const { from, to, control } of segments) {
    let t = 0;
    if (control) {
      const at = (value: number) => ({
        x:
          (1 - value) ** 2 * from.x +
          2 * value * (1 - value) * control.x +
          value ** 2 * to.x,
        y:
          (1 - value) ** 2 * from.y +
          2 * value * (1 - value) * control.y +
          value ** 2 * to.y,
      });
      for (const seed of [0, 0.25, 0.5, 0.75, 1])
        if (squared(at(seed), point) < squared(at(t), point)) t = seed;
      for (let iteration = 0; iteration < 6; iteration++) {
        const value = at(t),
          dx = 2 * ((1 - t) * (control.x - from.x) + t * (to.x - control.x)),
          dy = 2 * ((1 - t) * (control.y - from.y) + t * (to.y - control.y));
        const denominator =
          dx * dx +
          dy * dy +
          (value.x - point.x) * 2 * (to.x - 2 * control.x + from.x) +
          (value.y - point.y) * 2 * (to.y - 2 * control.y + from.y);
        if (!denominator) break;
        t = Math.max(
          0,
          Math.min(
            1,
            t -
              ((value.x - point.x) * dx + (value.y - point.y) * dy) /
                denominator,
          ),
        );
      }
      const value = at(t),
        candidate = squared(value, point);
      if (candidate < distance) {
        nearest = value;
        distance = candidate;
      }
    } else {
      const dx = to.x - from.x,
        dy = to.y - from.y,
        length = dx * dx + dy * dy;
      t = length
        ? Math.max(
            0,
            Math.min(
              1,
              ((point.x - from.x) * dx + (point.y - from.y) * dy) / length,
            ),
          )
        : 0;
      const value = { x: from.x + t * dx, y: from.y + t * dy },
        candidate = squared(value, point);
      if (candidate < distance) {
        nearest = value;
        distance = candidate;
      }
    }
  }
  return { point: nearest, distance: Math.sqrt(distance) };
}

export function closestGanttLink(
  routes: InteractiveGanttRoute[],
  point: RoutePoint,
  previous?: string,
) {
  const candidates = routes
    .map((route) => ({
      route,
      ...nearestGanttRoutePoint(route.segments, point),
    }))
    .filter((candidate) => candidate.distance <= 7)
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.route.edge.id.localeCompare(b.route.edge.id),
    );
  const retained = candidates.find(
      (candidate) => candidate.route.edge.id === previous,
    ),
    best = candidates[0];
  return retained && best && retained.distance <= best.distance + 3
    ? retained
    : (best ?? null);
}

export function ganttLinkActionPoint(
  point: RoutePoint,
  obstacles: RouteObstacle[],
  width: number,
  height: number,
): RoutePoint | null {
  const candidates = [point],
    seen = new Set<string>();
  let best: RoutePoint | null = null,
    distance = Infinity;
  for (let index = 0; index < candidates.length && index < 64; index++) {
    const candidate = {
      x: Math.max(12, Math.min(width - 12, candidates[index].x)),
      y: Math.max(12, Math.min(height - 12, candidates[index].y)),
    };
    const key = `${candidate.x}:${candidate.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const obstacle = obstacles.find(
      (rect) =>
        candidate.x + 12 > rect.left &&
        candidate.x - 12 < rect.right &&
        candidate.y + 12 > rect.top &&
        candidate.y - 12 < rect.bottom,
    );
    if (obstacle)
      candidates.push(
        { x: obstacle.left - 12, y: candidate.y },
        { x: obstacle.right + 12, y: candidate.y },
        { x: candidate.x, y: obstacle.top - 12 },
        { x: candidate.x, y: obstacle.bottom + 12 },
      );
    else if (squared(candidate, point) < distance) {
      best = candidate;
      distance = squared(candidate, point);
    }
  }
  return best;
}

export function ganttLinkObstacles(
  rows: ConnectionRow[],
  activeTask: number | null,
  width: number,
): RouteObstacle[] {
  return rows.flatMap(({ task, geometry: bar }) => {
    if (!bar.real || bar.displayLeft === null || bar.displayRight === null)
      return [];
    const result = [
      {
        left: bar.displayLeft,
        right: bar.displayRight,
        top: bar.y - 12,
        bottom: bar.y + 12,
      },
    ];
    if (bar.right! >= 0 && bar.labelLeft !== null && bar.labelLeft < width)
      result.push({
        left: bar.labelLeft,
        right: bar.labelSide === "before" ? bar.labelRight : width,
        top: bar.y - 12,
        bottom: bar.y + 12,
      });
    if (task.id === activeTask)
      for (const x of [
        bar.startConnector,
        bar.endConnector,
        bar.resizeStart,
        bar.resizeEnd,
      ])
        if (x !== null)
          result.push({
            left: x - 12,
            right: x + 12,
            top: bar.y - 12,
            bottom: bar.y + 12,
          });
    return result;
  });
}
