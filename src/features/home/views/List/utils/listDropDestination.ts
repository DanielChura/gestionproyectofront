import type { Task, TaskListGroup } from "../../../types";
import { taskDropPosition } from "../../../utils/taskDropPosition";
import type { DropPosition } from "../../../hooks/useTaskMove";

export interface ListDropContext {
  region: HTMLElement;
  tasks: Task[];
  byId: Map<number, Task>;
  rootById: Map<number, Task>;
  groups: TaskListGroup[];
}

export function listDropDestination(context: ListDropContext, x: number, y: number, source: Task): DropPosition | null {
  const { region, tasks, byId, rootById, groups } = context;
  const bounds = region.getBoundingClientRect();
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
  const task = byId.get(source.id) ?? source;
  const sections = Array.from(region.querySelectorAll<HTMLElement>("[data-group-key]"));
  const hovered = sections.find((section, i) => y >= section.getBoundingClientRect().top && y < (sections[i + 1]?.getBoundingClientRect().top ?? bounds.bottom)) ?? sections[0];
  const group = groups.find(item => item.key === hovered?.dataset.groupKey);
  if (!hovered || !group?.stateCode) return null;
  const root = rootById.get(task.id) ?? task;
  const changingChild = task.parent_id !== null && group.stateCode !== root.state_code;
  const state = task.parent_id !== null && !changingChild ? task.state_code : group.stateCode;
  const section = changingChild ? sections.find(item => item.dataset.groupKey === `state:${root.state_code}`) : hovered;
  const table = section?.querySelector("table");
  const heading = section?.querySelector("h2");
  if (!section || !table || !heading) return null;
  const tableBounds = table.getBoundingClientRect(), title = heading.getBoundingClientRect();
  const hidden = table.getClientRects().length === 0;
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"))
    .filter(row => row.getClientRects().length > 0)
    .map(row => {
      const rect = row.getBoundingClientRect();
      return { id: row.dataset.taskId ? Number(row.dataset.taskId) : undefined, reference: row.dataset.parentReference ? Number(row.dataset.parentReference) : undefined, top: rect.top, bottom: rect.bottom };
    });
  const hit = changingChild ? undefined : rows.find(row => y >= row.top && y < row.bottom && row.id !== undefined);
  const target = hit?.id === undefined ? undefined : byId.get(hit.id);
  if (target && target.id !== task.id && target.id !== task.parent_id && (target.parent_id !== task.parent_id || target.state_code !== state)) return null;
  const position = hidden ? { before: null, y: title.bottom } : taskDropPosition(task, state, tasks, rows, changingChild ? Infinity : y, tableBounds.bottom);
  return {
    state,
    before: position.before,
    top: Math.max(position.y, Math.min(title.bottom, tableBounds.bottom || title.bottom)) - bounds.top + region.scrollTop,
    left: (hidden ? section.getBoundingClientRect().left : tableBounds.left) - bounds.left + region.scrollLeft,
    width: hidden ? section.offsetWidth : tableBounds.width,
  };
}
