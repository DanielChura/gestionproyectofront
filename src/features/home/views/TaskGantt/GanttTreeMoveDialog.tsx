import { useState } from "react";
import type { Task } from "../../types";
import Modal from "../../../../shared/components/Modal/Modal";
import { ganttControl } from "./GanttControl";

export default function GanttTreeMoveDialog({
  task,
  tasks,
  visible,
  filtered,
  onMove,
  onClose,
}: {
  task: Task;
  tasks: Task[];
  visible: Set<number>;
  filtered: boolean;
  onMove: (parent: number | null, before: number | null) => void;
  onClose: () => void;
}) {
  const [parent, setParent] = useState(task.parent_id),
    [before, setBefore] = useState<number | null>(null);
  const siblings = tasks.filter(
    (item) => item.parent_id === parent && item.id !== task.id,
  );
  const ambiguous = filtered && siblings.some((item) => !visible.has(item.id));
  return (
    <Modal title="Mover tarea" onClose={onClose}>
      <form
        className="grid gap-3 p-4 text-xs"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ambiguous) onMove(parent, before);
        }}
      >
        <p className="m-0 truncate">{task.name}</p>
        {task.parent_id !== null && (
          <label className="grid gap-1">
            Padre
            <select
              data-initial-focus
              className={ganttControl}
              value={parent!}
              onChange={(event) => {
                setParent(Number(event.target.value));
                setBefore(null);
              }}
            >
              {tasks
                .filter(
                  (item) =>
                    item.id === task.parent_id ||
                    (item.parent_id === null &&
                      item.permissions.edit &&
                      !["done", "closed"].includes(item.state_category ?? "")),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="grid gap-1">
          Insertar antes de
          <select
            data-initial-focus={task.parent_id === null || undefined}
            className={ganttControl}
            value={before ?? ""}
            onChange={(event) =>
              setBefore(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Al final</option>
            {siblings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {ambiguous && (
          <p role="alert">
            Quita los filtros para elegir una posición inequívoca.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={ganttControl} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={ganttControl} disabled={ambiguous}>
            Mover
          </button>
        </div>
      </form>
    </Modal>
  );
}
