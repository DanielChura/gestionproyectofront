import type { Task } from "../types";
export interface DropRow {
    id?: number;
    reference?: number;
    top: number;
    bottom: number;
}
export function taskDropPosition(task: Task, state: string, tasks: Task[], rows: DropRow[], y: number, emptyY: number) {
    const byId = new Map(tasks.map((item) => [item.id, item]));
    const belongsTo = (id: number | undefined, parent: number): boolean => {
        const seen = new Set<number>();
        let current = id === undefined ? undefined : byId.get(id);
        while (current && !seen.has(current.id)) {
            if (current.id === parent)
                return true;
            seen.add(current.id);
            current =
                current.parent_id === null ? undefined : byId.get(current.parent_id);
        }
        return false;
    };
    const siblings = tasks.filter((item) => item.id !== task.id &&
        item.parent_id === task.parent_id &&
        item.state_code === state);
    const visible = siblings.flatMap((item) => {
        const row = rows.find((row) => row.id === item.id);
        return row ? [{ item, row }] : [];
    });
    const next = visible.find(({ row }) => y < (row.top + row.bottom) / 2);
    if (next)
        return { before: next.item.id, y: next.row.top };
    const last = visible.at(-1);
    if (last) {
        const descendants = rows.filter((row) => belongsTo(row.id ?? row.reference, last.item.id));
        return {
            before: null,
            y: Math.max(last.row.bottom, ...descendants.map((row) => row.bottom)),
        };
    }
    if (task.parent_id !== null) {
        const parent = rows.find((row) => row.id === task.parent_id || row.reference === task.parent_id);
        if (parent)
            return { before: null, y: parent.bottom };
        let root = byId.get(task.parent_id);
        const seen = new Set<number>();
        while (root?.parent_id != null &&
            byId.has(root.parent_id) &&
            !seen.has(root.id)) {
            seen.add(root.id);
            root = byId.get(root.parent_id);
        }
        const order = new Map(tasks.map((item, index) => [item.id, index]));
        const following = root &&
            rows.find((row) => (order.get(row.id ?? row.reference ?? -1) ?? -1) >
                order.get(root!.id)!);
        if (following)
            return { before: null, y: following.top };
    }
    return { before: null, y: rows.at(-1)?.bottom ?? emptyY };
}
