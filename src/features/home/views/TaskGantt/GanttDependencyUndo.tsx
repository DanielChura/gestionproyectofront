import { useEffect, useState } from "react";
import { useGanttLinks } from "./useGanttLinks";
import { useTaskSync } from "../../utils/useTaskSync";
import type { TaskGanttProps } from "./types";
import { ganttControl } from "./GanttControl";

export interface RemovedGanttLink {
  source: number;
  target: number;
  type?: import("../../types").DependencyType | null;
  expires: number;
  token?: string;
}
export default function GanttDependencyUndo({
  props,
  removed,
  onClose,
  readOnly = false,
}: {
  props: TaskGanttProps;
  removed: RemovedGanttLink;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const source = props.tasks.find((task) => task.id === removed.source),
    target = props.tasks.find((task) => task.id === removed.target);
  const mutation = useGanttLinks(props, source),
    sync = useTaskSync();
  const [expired, setExpired] = useState(() => Date.now() >= removed.expires);
  useEffect(() => {
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, removed.expires - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [removed.expires]);
  function confirmed() {
    onClose();
  }
  const uncertain = mutation.uncertain || mutation.unconfirmed !== null;
  useEffect(() => {
    if (expired && !mutation.busy) onClose();
  }, [expired, mutation.busy, uncertain, onClose]);
  if (!source || !target || expired) return null;
  async function undo() {
    if (readOnly || Date.now() >= removed.expires || !source || !target) {
      setExpired(true);
      return;
    }
    if (removed.token && (await mutation.restore(target.id, removed.token)))
      confirmed();
  }
  async function consult() {
    if (
      (await mutation.consult()) &&
      sync.current(target!).dependencies.includes(removed.source)
    )
      confirmed();
  }
  return (
    <aside
      aria-label="Dependencia retirada"
      role="status"
      className="gm-gantt-undo pointer-events-none grid [&_button]:pointer-events-auto max-w-[calc(100vw-32px)] gap-2 rounded-lg border border-neutral-300 bg-white p-3 text-xs text-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
    >
      <div className="flex items-center justify-between gap-4">
        <span>Se ha eliminado la dependencia.</span>
        <button
          type="button"
          aria-label="Cerrar aviso de dependencia"
          className={ganttControl}
          disabled={mutation.busy || uncertain}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {mutation.error && <span role="alert">{mutation.error}</span>}
      {uncertain ? (
        <button
          type="button"
          className={ganttControl}
          disabled={mutation.busy}
          onClick={() => void consult()}
        >
          Consultar restauración
        </button>
      ) : (
        <button
          type="button"
          className={ganttControl}
          disabled={
            readOnly ||
            mutation.busy ||
            !removed.token ||
            !source.permissions.dependencies ||
            !target.permissions.dependencies
          }
          onClick={() => void undo()}
        >
          {mutation.busy ? "Restaurando…" : "Deshacer"}
        </button>
      )}
    </aside>
  );
}
