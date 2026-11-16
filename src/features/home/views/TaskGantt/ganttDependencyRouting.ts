import { ganttRouteSegments } from "./ganttRouteSegments";
import type { GanttDependency } from "./ganttQuery";
import type { ConnectionRow } from "./useGanttConnection";
export interface RoutePoint {
    x: number;
    y: number;
}
export interface RouteObstacle {
    left: number;
    right: number;
    top: number;
    bottom: number;
}
export interface GanttLinkRoute {
    edge: GanttDependency;
    points: RoutePoint[];
    path: string;
    action: RoutePoint;
}
const margin = 5, exit = 16;
export function crossesObstacle(a: RoutePoint, b: RoutePoint, r: RouteObstacle) {
    return a.x === b.x ? a.x > r.left && a.x < r.right && Math.max(a.y, b.y) > r.top && Math.min(a.y, b.y) < r.bottom
        : a.y > r.top && a.y < r.bottom && Math.max(a.x, b.x) > r.left && Math.min(a.x, b.x) < r.right;
}
export function roundedRoute(points: RoutePoint[]) {
    if (!points.length)
        return "";
    return `M${points[0].x},${points[0].y}` + ganttRouteSegments(points).map(segment => segment.control
        ? `Q${segment.control.x},${segment.control.y} ${segment.to.x},${segment.to.y}`
        : `L${segment.to.x},${segment.to.y}`).join("");
}
function simplify(points: RoutePoint[]) {
    const unique = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
    return unique.filter((p, i) => {
        const a = unique[i - 1], b = unique[i + 1];
        return !a || !b || !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y));
    });
}
export function routeGanttDependencies(rows: ConnectionRow[], dependencies: GanttDependency[], width: number, height: number): {
    routes: GanttLinkRoute[];
    obstacles: RouteObstacle[];
    nodes: number;
    unrouted: number;
} {
    const positions = new Map(rows.map(row => [row.task.id, row.geometry]));
    const point = (id: number, end: boolean) => {
        const bar = positions.get(id), x = end ? bar?.displayRight ?? bar?.right : bar?.displayLeft ?? bar?.left;
        return bar?.real && x != null && Number.isFinite(x) ? { x, y: bar.y } : null;
    };
    const visible = dependencies.filter(edge => {
        const source = point(edge.predecessor.id, edge.type?.[0] !== "S");
        const target = point(edge.successor.id, edge.type?.[1] === "F");
        return source && target && Math.min(source.x, target.x) <= width && Math.max(source.x, target.x) >= 0;
    }).sort((a, b) => a.id.localeCompare(b.id));
    const ports = new Map<string, string[]>();
    for (const edge of visible)
        for (const [id, side, role] of [[edge.predecessor.id, edge.type?.[0] ?? "F", "out"], [edge.successor.id, edge.type?.[1] ?? "S", "in"]]) {
            const key = `${id}:${side}:${role}`, group = ports.get(key) ?? [];
            group.push(edge.id);
            ports.set(key, group);
        }
    const port = (edge: GanttDependency, source: boolean) => {
        const id = source ? edge.predecessor.id : edge.successor.id, side = (source ? edge.type?.[0] ?? "F" : edge.type?.[1] ?? "S");
        const group = ports.get(`${id}:${side}:${source ? "out" : "in"}`)!;
        const p = point(id, side === "F")!;
        return { x: p.x, y: p.y + (group.indexOf(edge.id) - (group.length - 1) / 2) * Math.min(5, 14 / group.length) };
    };
    const obstacles: RouteObstacle[] = [];
    for (const { geometry: b } of rows) {
        if (!b.real || b.left === null || b.right === null || b.right < 0 || b.left > width)
            continue;
        obstacles.push({ left: Math.max(-24, (b.displayLeft ?? b.left) - margin), right: Math.min(width + 24, (b.displayRight ?? b.right) + margin), top: b.y - 12 - margin, bottom: b.y + 12 + margin });
        if (b.labelLeft !== null && b.labelLeft < width)
            obstacles.push({ left: b.labelLeft - margin, right: (b.labelSide === "before" ? b.labelRight : width) + margin, top: b.y - 12 - margin, bottom: b.y + 12 + margin });
    }
    const byEdge = new Map(visible.map(edge => [edge.id, edge]));
    for (const [key, group] of ports)
        group.sort((a, b) => {
            const first = byEdge.get(a)!, second = byEdge.get(b)!;
            const firstId = key.endsWith(":in") ? first.predecessor.id : first.successor.id;
            const secondId = key.endsWith(":in") ? second.predecessor.id : second.successor.id;
            return positions.get(firstId)!.y - positions.get(secondId)!.y || a.localeCompare(b);
        });
    const routes: GanttLinkRoute[] = [];
    const horizontal: {
        y: number;
        left: number;
        right: number;
    }[] = [];
    const vertical: {
        x: number;
        top: number;
        bottom: number;
    }[] = [];
    const lanes = new Map<string, number>();
    const centers = rows.map(row => row.geometry.y).sort((a, b) => a - b);
    const rowHeight = centers.length > 1 ? centers[1] - centers[0] : 40;
    const leftLane = Math.min(0, ...obstacles.map(r => r.left)) - 8;
    const rightLane = Math.max(width, ...obstacles.map(r => r.right)) + 8;
    let attempts = 0;
    function usable(points: RoutePoint[]) {
        for (let i = 2; i < points.length - 1; i++)
            if (obstacles.some(r => crossesObstacle(points[i - 1], points[i], r)))
                return false;
        return true;
    }
    function laneKey(a: RoutePoint, b: RoutePoint) {
        return a.x === b.x ? `x:${a.x.toFixed(2)}` : `y:${a.y.toFixed(2)}`;
    }
    function cost(points: RoutePoint[]) {
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i];
            total += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
            total += (lanes.get(laneKey(a, b)) ?? 0) * 12;
            if (a.x === b.x) {
                for (const line of horizontal)
                    if (line.y > Math.min(a.y, b.y) && line.y < Math.max(a.y, b.y) && a.x > line.left && a.x < line.right)
                        total += 6;
            }
            else {
                for (const line of vertical)
                    if (line.x > Math.min(a.x, b.x) && line.x < Math.max(a.x, b.x) && a.y > line.top && a.y < line.bottom)
                        total += 6;
            }
        }
        return total;
    }
    function portDistance(id: number, end: boolean, slot: number) {
        const bar = positions.get(id)!;
        const gap = end && bar.labelSide !== "before" && bar.labelLeft !== null
            ? bar.labelLeft - (bar.displayRight ?? bar.right!)
            : !end && bar.labelSide === "before"
                ? (bar.displayLeft ?? bar.left!) - bar.labelRight
                : Infinity;
        return Math.min(exit + slot * 2, Math.max(1, gap - margin - 1));
    }
    for (const edge of visible) {
        const a = port(edge, true), b = port(edge, false);
        const sourceEnd = edge.type?.[0] !== "S", targetEnd = edge.type?.[1] === "F";
        const slot = routes.length % 7;
        const aOut = { x: a.x + (sourceEnd ? 1 : -1) * portDistance(edge.predecessor.id, sourceEnd, slot), y: a.y };
        const bOut = { x: b.x + (targetEnd ? 1 : -1) * portDistance(edge.successor.id, targetEnd, slot), y: b.y };
        const sourceCenter = positions.get(edge.predecessor.id)!.y, targetCenter = positions.get(edge.successor.id)!.y;
        const direction = sourceCenter < targetCenter ? 1 : -1;
        const gapOffset = (slot % 3 - 1) * 1.5;
        const sourceGap = sourceCenter + direction * rowHeight / 2 + gapOffset;
        const targetGap = targetCenter - direction * rowHeight / 2 + gapOffset;
        const candidates = [...new Set([aOut.x, bOut.x, (aOut.x + bOut.x) / 2, aOut.x - 6, aOut.x + 6, bOut.x - 6, bOut.x + 6, leftLane - slot * 3, rightLane + slot * 3])];
        let best: RoutePoint[] | null = null, bestCost = Infinity;
        for (const x of candidates) {
            attempts++;
            const points = [a, aOut, { x: aOut.x, y: sourceGap }, { x, y: sourceGap }, { x, y: targetGap }, { x: bOut.x, y: targetGap }, bOut, b];
            if (!usable(points))
                continue;
            const score = cost(points);
            if (score < bestCost) {
                bestCost = score;
                best = points;
            }
        }
        if (!best)
            continue;
        for (let i = 1; i < best.length; i++) {
            const key = laneKey(best[i - 1], best[i]);
            lanes.set(key, (lanes.get(key) ?? 0) + 1);
        }
        const points = simplify(best);
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i];
            if (a.x === b.x)
                vertical.push({ x: a.x, top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) });
            else
                horizontal.push({ y: a.y, left: Math.min(a.x, b.x), right: Math.max(a.x, b.x) });
        }
        const segments = points.slice(1).flatMap((p, i) => {
            const a = points[i];
            if (a.x === p.x && (a.x < 0 || a.x > width) || a.y === p.y && (a.y < 0 || a.y > height))
                return [];
            const clip = (point: RoutePoint) => ({ x: Math.max(0, Math.min(width, point.x)), y: Math.max(0, Math.min(height, point.y)) });
            return [{ a: clip(a), b: clip(p) }];
        }).sort((a, b) => Math.hypot(b.a.x - b.b.x, b.a.y - b.b.y) - Math.hypot(a.a.x - a.b.x, a.a.y - a.b.y));
        const longest = segments[0];
        if (!longest)
            continue;
        routes.push({ edge, points, path: roundedRoute(points), action: { x: (longest.a.x + longest.b.x) / 2, y: (longest.a.y + longest.b.y) / 2 } });
    }
    return { routes, obstacles, nodes: attempts, unrouted: visible.length - routes.length };
}
