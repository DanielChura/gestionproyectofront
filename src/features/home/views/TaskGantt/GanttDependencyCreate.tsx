import GanttNotice from "./GanttNotice";
import { useLayoutEffect, useEffect, useRef, useState } from "react";
import type { DependencyType } from "../../types";
import type { TaskGanttProps } from "./types";
import { useGanttLinks } from "./useGanttLinks";
import { ganttControl } from "./GanttControl";
import { useTaskSync } from "../../utils/useTaskSync";
export default function GanttDependencyCreate({
  props,
  operation,
  onBusyChange,
  onClose,
}: {
  props: TaskGanttProps;
  operation: {
    source: number;
    target: number;
    type: DependencyType;
  };
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
}) {
  const source = props.tasks.find((task) => task.id === operation.source);
  const target = props.tasks.find((task) => task.id === operation.target);
  const mutation = useGanttLinks(props, source),
    started = useRef(false);
  const sync = useTaskSync();
  const [consulted, setConsulted] = useState(false);
  const eligible =
    source &&
    target &&
    source.permissions.dependencies &&
    target.permissions.dependencies;
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (
      !source ||
      !target ||
      !source.permissions.dependencies ||
      !target.permissions.dependencies
    )
      return;
    void mutation
      .link("blocks", target.id, "", operation.type)
      .then((saved) => {
        if (saved) close.current();
      });
  }, [mutation, operation, source, target]);
  const unresolved = mutation.uncertain || mutation.unconfirmed !== null;
  useEffect(() => {
    onBusyChange(mutation.busy);
  }, [mutation.busy, unresolved, onBusyChange]);
  async function consult() {
    if (!(await mutation.consult()) || !target) return;
    const confirmed = sync
      .current(target)
      .dependency_links?.some(
        (link) =>
          link.predecessor_id === operation.source &&
          link.type === operation.type,
      );
    if (confirmed) close.current();
    else setConsulted(true);
  }
  if (!mutation.error && (mutation.busy || (!unresolved && eligible)))
    return null;
  return (
    <GanttNotice
      label="Guardado de dependencia"
      onExpire={() => {
        if (unresolved) props.onRetry();
        close.current();
      }}
    >
      <span role={mutation.error ? "alert" : "status"}>
        {mutation.error ||
          (!eligible
            ? "La relación requiere dos tareas autorizadas."
            : consulted
              ? "La consulta confirmó que el vínculo propuesto no está guardado. Puedes trazar una nueva intención."
              : "Guardando dependencia…")}
      </span>
      {unresolved && (
        <button
          type="button"
          className={ganttControl}
          disabled={mutation.busy}
          onClick={() => void consult()}
        >
          Consultar resultado
        </button>
      )}
      {!mutation.busy && !unresolved && (
        <button type="button" className={ganttControl} onClick={onClose}>
          Cerrar aviso
        </button>
      )}
    </GanttNotice>
  );
}
