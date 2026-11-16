import GanttNotice from "./GanttNotice";
import type { DependencyType } from "../../types";
import type { TaskGanttProps } from "./types";
import { useGanttLinks } from "./useGanttLinks";
import { ganttControl } from "./GanttControl";
import Modal from "../../../../shared/components/Modal/Modal";
import { useTaskSync } from "../../utils/useTaskSync";
import { useEffect, useRef, useState } from "react";
import DependencyTypeSelect from "../../shared/task-fields/DependencyTypeSelect";
export default function GanttDependencyOperation({
  props,
  sourceId,
  targetId,
  onClose,
  onBusyChange,
  onRemoved,
  initialType,
  readOnly = false,
  autoRemove = false,
}: {
  props: TaskGanttProps;
  sourceId: number;
  targetId: number;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
  onRemoved?: (
    source: number,
    target: number,
    type: DependencyType | null,
    receipt?: import("../../types").DependencyUndoReceipt,
  ) => void;
  initialType?: DependencyType;
  readOnly?: boolean;
  autoRemove?: boolean;
}) {
  const source = props.tasks.find((task) => task.id === sourceId),
    target = props.tasks.find((task) => task.id === targetId);
  const mutation = useGanttLinks(props, source);
  useEffect(() => {
    onBusyChange(mutation.busy);
  }, [mutation.busy, mutation.uncertain, mutation.unconfirmed, onBusyChange]);
  const sync = useTaskSync();
  const [type, setType] = useState<DependencyType | "">(initialType ?? "");
  const [existingType] = useState(
    () =>
      target?.dependency_links?.find((link) => link.predecessor_id === sourceId)
        ?.type ?? null,
  );
  const [exists] = useState(
    () => target?.dependencies.includes(sourceId) ?? false,
  );
  const started = useRef(false);
  useEffect(() => {
    if (
      !autoRemove ||
      started.current ||
      readOnly ||
      !source ||
      !target ||
      !source.permissions.dependencies ||
      !target.permissions.dependencies
    )
      return;
    started.current = true;
    void mutation
      .unlink({
        id: `${source.id}:${target.id}`,
        kind: "blocks",
        name: "",
        target_id: target.id,
        target_name: target.name,
        predecessor_id: source.id,
        successor_id: target.id,
        dependency_type: existingType,
      })
      .then((saved) => {
        if (saved) finish();
      });
  });
  if (!source || !target) return null;
  function finish() {
    if (exists && !sync.current(target!).dependencies.includes(sourceId))
      onRemoved?.(
        sourceId,
        targetId,
        existingType,
        mutation.undoReceipt.current,
      );
    onClose();
  }
  async function consult() {
    if (
      (await mutation.consult()) &&
      sync.current(target!).dependencies.includes(sourceId) !== exists
    )
      finish();
  }
  if (autoRemove) {
    if (
      !mutation.error &&
      (mutation.busy || (!mutation.uncertain && mutation.unconfirmed === null))
    )
      return null;
    return (
      <GanttNotice
        label="Retirada de dependencia"
        onExpire={() => {
          if (mutation.uncertain || mutation.unconfirmed !== null)
            props.onRetry();
          onClose();
        }}
      >
        <span>
          {mutation.error || "Falta confirmar la retirada de la dependencia."}
        </span>
        {(mutation.uncertain || mutation.unconfirmed !== null) && (
          <button
            type="button"
            className={ganttControl}
            disabled={mutation.busy}
            onClick={() => void consult()}
          >
            Consultar resultado
          </button>
        )}
        {!mutation.busy &&
          !mutation.uncertain &&
          mutation.unconfirmed === null && (
            <button type="button" className={ganttControl} onClick={onClose}>
              Cerrar aviso
            </button>
          )}
      </GanttNotice>
    );
  }
  return (
    <Modal
      title="Dependencia"
      onClose={onClose}
      busy={
        mutation.busy || mutation.uncertain || mutation.unconfirmed !== null
      }
    >
      <section
        className="flex flex-wrap items-center gap-2 border-t border-neutral-200 py-2 text-xs dark:border-neutral-700 dark:text-neutral-200"
        aria-label="Operación de dependencia"
      >
        <span>
          {source.name} bloquea a {target.name}
        </span>
        {!exists && (
          <DependencyTypeSelect
            value={type}
            onChange={setType}
            disabled={mutation.busy}
          />
        )}
        {exists && <span>{existingType ?? "Legado informativo"}</span>}
        {mutation.error && <span role="alert">{mutation.error}</span>}
        {mutation.unconfirmed !== null ? (
          <>
            <span role="status">
              La escritura terminó; falta consultar el resultado.
            </span>
            <button
              type="button"
              className={ganttControl}
              disabled={mutation.busy}
              onClick={() => {
                void consult();
              }}
            >
              Consultar resultado
            </button>
          </>
        ) : (
          !readOnly &&
          source.permissions.dependencies &&
          target.permissions.dependencies && (
            <button
              type="button"
              className={ganttControl}
              disabled={
                mutation.busy || mutation.uncertain || (!exists && !type)
              }
              onClick={() => {
                void (
                  exists
                    ? mutation.unlink({
                        id: `${source.id}:${target.id}`,
                        kind: "blocks",
                        name: "",
                        target_id: target.id,
                        target_name: target.name,
                        predecessor_id: source.id,
                        successor_id: target.id,
                      })
                    : mutation.link("blocks", target.id, "", type || undefined)
                ).then((saved) => {
                  if (saved) finish();
                });
              }}
            >
              {mutation.busy
                ? "Guardando…"
                : exists
                  ? "Retirar dependencia"
                  : "Confirmar vínculo"}
            </button>
          )
        )}
        {mutation.uncertain && mutation.unconfirmed === null && (
          <button
            type="button"
            className={ganttControl}
            onClick={() => {
              void consult();
            }}
          >
            Consultar resultado
          </button>
        )}
        <button
          type="button"
          className={ganttControl}
          disabled={mutation.busy}
          onClick={() => props.onOpenTask(target.id, "relations")}
        >
          Abrir relaciones
        </button>
        <button
          type="button"
          className={ganttControl}
          disabled={mutation.busy}
          onClick={onClose}
        >
          Cerrar
        </button>
      </section>
    </Modal>
  );
}
