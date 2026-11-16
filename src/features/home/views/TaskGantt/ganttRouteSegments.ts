import type { RoutePoint } from "./ganttDependencyRouting";
export type GanttRouteSegment = {
  from: RoutePoint;
  to: RoutePoint;
  control?: RoutePoint;
};

export function ganttRouteSegments(points: RoutePoint[]): GanttRouteSegment[] {
  if (points.length < 2) return [];
  const result: GanttRouteSegment[] = [];
  let from = points[0];
  for (let index = 1; index < points.length - 1; index++) {
    const a = points[index - 1],
      b = points[index],
      c = points[index + 1];
    const radius = Math.min(
      3,
      Math.hypot(b.x - a.x, b.y - a.y) / 2,
      Math.hypot(c.x - b.x, c.y - b.y) / 2,
    );
    const before = {
      x: b.x - Math.sign(b.x - a.x) * radius,
      y: b.y - Math.sign(b.y - a.y) * radius,
    };
    const after = {
      x: b.x + Math.sign(c.x - b.x) * radius,
      y: b.y + Math.sign(c.y - b.y) * radius,
    };
    result.push({ from, to: before }, { from: before, control: b, to: after });
    from = after;
  }
  result.push({ from, to: points[points.length - 1] });
  return result;
}
