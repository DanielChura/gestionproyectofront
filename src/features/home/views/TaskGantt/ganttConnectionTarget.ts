import { toGanttWindow } from "./ganttCalendar";
import type { Task } from "../../types";
import type { ConnectionRow } from "./useGanttConnection";
export type ConnectionSide = "start" | "end";
export interface ConnectionTarget {
    id: number;
    side: ConnectionSide;
}
export function ganttConnectionTarget(hit: Element | null, rows: ConnectionRow[], source: number, x: number, y: number, sourceSide?: ConnectionSide, scope?: { tasks: Task[]; allowed: ReadonlySet<number> }): ConnectionTarget | null {
    if (!hit || hit.closest(".gm-gantt-exterior,[data-gantt-calendar-mode],.gm-gantt-links,.gm-gantt-offscreen"))
        return null;
    const connector = hit.closest<HTMLElement>("[data-connector-task]");
    const body = hit.closest<HTMLElement>("[data-gantt-calendar-task]") ?? hit.closest(".wx-bar")?.querySelector<HTMLElement>("[data-gantt-calendar-task]");
    const id = Number(connector?.dataset.connectorTask ?? body?.dataset.ganttCalendarTask);
    const row = rows.find(row => row.task.id === id);
    if (id === source || scope && !scope.allowed.has(id) || !row?.geometry.connectable || Math.abs(y - row.geometry.y) > 16)
        return null;
    const bar = row.geometry;
    if (connector) {
        const side = connector.dataset.connectorSide as ConnectionSide;
        const center = side === "start" ? bar.startConnector : bar.endConnector;
        if (center === null || Math.abs(x - center) > 12) return null;
        const origin = scope?.tasks.find(item => item.id === source) ?? rows.find(item => item.task.id === source)?.task;
        const target = scope?.tasks.find(item => item.id === id) ?? row.task;
        return { id, side: sourceSide && origin ? compatibleGanttTarget(origin, target, sourceSide, side) : side };
    }
    if (bar.left === null || bar.right === null || x < (bar.displayLeft ?? bar.left) - 1 || x > (bar.displayRight ?? bar.right) + 1)
        return null;
    const origin = scope?.tasks.find(item => item.id === source) ?? rows.find(item => item.task.id === source)?.task;
    const target = scope?.tasks.find(item => item.id === id) ?? row.task;
    return { id, side: sourceSide && origin ? compatibleGanttTarget(origin, target, sourceSide, "start") : "start" };
}

export function compatibleGanttTarget(source: Task, target: Task, origin: ConnectionSide, requested: ConnectionSide): ConnectionSide {
    const a = toGanttWindow(source), b = toGanttWindow(target);
    const requirement = origin === "start" ? a.start : a.end;
    const chosen = requested === "start" ? b.start : b.end;
    const alternative = requested === "start" ? b.end : b.start;
    if (requirement && chosen && chosen < requirement && alternative && alternative >= requirement)
        return requested === "start" ? "end" : "start";
    return requested;
}

export function ganttConnectionTargets(tasks: Task[], sourceId: number): Set<number> {
    const byId = new Map(tasks.map(task => [task.id, task]));
    const source = byId.get(sourceId);
    if (!source?.permissions.dependencies) return new Set();
    const blocked = new Set([sourceId]);
    const pending = [sourceId];
    while (pending.length) {
        const row = byId.get(pending.pop()!);
        for (const predecessor of row?.dependencies ?? []) {
            if (!blocked.has(predecessor)) { blocked.add(predecessor); pending.push(predecessor); }
        }
    }
    return new Set(tasks.filter(task => task.permissions.dependencies && !blocked.has(task.id) && !task.dependencies.includes(sourceId)).map(task => task.id));
}
