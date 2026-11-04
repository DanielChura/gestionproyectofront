import type { TaskGanttProps } from "./types";
import { useGanttLinks } from "./useGanttLinks";
import { ganttControl } from "./GanttControl";
import { useEffect } from "react";

export default function GanttDependencyOperation({ props, sourceId, targetId, onClose, onBusyChange }: {
  props: TaskGanttProps; sourceId: number; targetId: number; onClose: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const source = props.tasks.find(task => task.id === sourceId), target = props.tasks.find(task => task.id === targetId);
  const mutation = useGanttLinks(props, source);
  useEffect(() => { onBusyChange(mutation.busy || mutation.uncertain || mutation.unconfirmed !== null); }, [mutation.busy, mutation.uncertain, mutation.unconfirmed, onBusyChange]);
  if (!source || !target) return null;
  const exists = target.dependencies.includes(source.id);
  return <section className="flex flex-wrap items-center gap-2 border-t border-neutral-200 py-2 text-xs dark:border-neutral-700 dark:text-neutral-200" aria-label="Operación de dependencia">
    <span>{source.name} bloquea a {target.name}</span>
    {mutation.error && <span role="alert">{mutation.error}</span>}
    {mutation.unconfirmed !== null ? <><span role="status">La escritura terminó; falta consultar el resultado.</span><button type="button" className={ganttControl} disabled={mutation.busy} onClick={() => { void mutation.reconcile(target.id).then(onClose).catch(() => {}); }}>Consultar resultado</button></>
      : source.parent_id === null && target.parent_id === null && source.permissions.dependencies && target.permissions.dependencies && <button type="button" className={ganttControl} disabled={mutation.busy || mutation.uncertain}
        onClick={() => { void (exists ? mutation.unlink({ id: `${source.id}:${target.id}`, kind: "blocks", name: "", target_id: target.id, target_name: target.name, predecessor_id: source.id, successor_id: target.id }) : mutation.link("blocks", target.id, "")).then(saved => { if (saved) onClose(); }); }}>
        {mutation.busy ? "Guardando…" : exists ? "Retirar dependencia" : "Confirmar vínculo"}</button>}
    {mutation.uncertain && mutation.unconfirmed === null && <button type="button" className={ganttControl} onClick={() => { void mutation.reconcile(target.id).then(onClose).catch(() => {}); }}>Consultar resultado</button>}
    <button type="button" className={ganttControl} disabled={mutation.busy} onClick={() => props.onOpenTask(target.id, "relations")}>Abrir relaciones</button>
    <button type="button" className={ganttControl} disabled={mutation.busy} onClick={onClose}>Cerrar</button>
  </section>;
}
