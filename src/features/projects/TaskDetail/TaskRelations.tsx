import { useEffect, useId, useRef, useState } from "react";
import type { RelationKind, Task, TaskIdentity, TaskPage, TaskRelation } from "../types";
import TaskProperty from "../TaskForm/TaskProperty";
import RelationIcon from "../../../shared/icons/RelationIcon";
import { StateLabel } from "../TaskList/TaskCell";
import { useRelationMutation, useRelationPicker } from "./useTaskRelations";

const labels: Record<RelationKind, string> = { blocks: "Esta tarea bloquea...", blocked_by: "Esta tarea está bloqueada por...", custom: "Nueva relación personalizada" };
const button = "cursor-pointer rounded-lg px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50";

function RelationPicker({ target, kind, onLink, busy, error, close }: {
  target: TaskIdentity; kind: RelationKind; onLink: (kind: RelationKind, otherId: number, name: string) => Promise<boolean>;
  busy: boolean; error: string; close: () => void;
}) {
  const picker = useRelationPicker(target, kind);
  const search = useRef<HTMLInputElement>(null); const id = useId();
  useEffect(() => { search.current?.focus(); }, []);
  return <div className="grid gap-2" aria-busy={busy}>
    <p className="m-0 text-xs font-medium text-neutral-800">{labels[kind]}</p>
    {kind === "custom" && <><label htmlFor={`${id}-name`}>Nombre de relación</label><input id={`${id}-name`} name="relation_name" autoComplete="off" maxLength={70} required value={picker.name} onChange={(event) => picker.setName(event.target.value)} disabled={busy} /></>}
    <label className="sr-only" htmlFor={`${id}-search`}>Buscar tareas</label>
    <input ref={search} id={`${id}-search`} name="related_search" type="search" autoComplete="off" maxLength={100} placeholder="Buscar..." value={picker.query} disabled={busy} onChange={(event) => picker.setQuery(event.target.value)}
      onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); event.currentTarget.closest('[popover]')?.querySelector<HTMLButtonElement>('[data-candidate]:not(:disabled)')?.focus(); } }} />
    <h3 className="m-0 text-xs font-medium text-neutral-600">Tareas recientes</h3>
    <p className="m-0 text-[10px] text-neutral-600">Más recientes primero. Selecciona una tarea para crear el vínculo.</p>
    {picker.searching && <p role="status">Cargando tareas…</p>}
    {(error || picker.results.error) && <p role="alert" className="m-0 text-xs text-red-700">{error || picker.results.error} <button type="button" className="cursor-pointer underline" onClick={() => { void picker.results.refresh(); }}>Reintentar</button></p>}
    {!picker.searching && picker.results.value?.items.length === 0 && <p className="text-xs text-neutral-600">No hay tareas elegibles que coincidan.</p>}
    <div className="max-h-64 overflow-y-auto overscroll-contain" onKeyDown={(event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-candidate]:not(:disabled)'));
      if (!controls.length) return;
      event.preventDefault(); const index = controls.indexOf(document.activeElement as HTMLButtonElement);
      controls[event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length]?.focus();
    }}>{!picker.searching && picker.results.value?.items.map((task) => <button key={task.id} data-candidate type="button" disabled={busy || (kind === "custom" && !picker.name.trim())}
      aria-label={`Vincular ${task.name}`} className={`${button} flex w-full items-center gap-2 disabled:opacity-50`} onClick={() => { void onLink(kind, task.id, picker.name).then((saved) => { if (saved) close(); }); }}>
      <StateLabel code={task.state_code} name={task.state_name} category={task.state_category} color={task.state_color} /><span className="min-w-0 truncate">{task.name}</span>
    </button>)}</div>
    {!picker.searching && picker.results.value?.next_cursor != null && <button type="button" className={button} disabled={picker.results.moreBusy || busy} onClick={() => { void picker.results.loadMore(); }}>{picker.results.moreBusy ? "Cargando…" : "Más tareas"}</button>}
  </div>;
}

function RelationChooser({ target, task, mutation, close }: { target: TaskIdentity; task: Task; mutation: ReturnType<typeof useRelationMutation>; close: () => void }) {
  const [kind, setKind] = useState<RelationKind | null>(null);
  if (mutation.uncertain) return <div className="grid gap-2 text-xs"><p role="status">Resultado sin confirmar. Consulta las relaciones antes de otra operación; no se repetirá el envío.</p><button type="button" className={button} disabled={mutation.busy} onClick={() => { void mutation.consult().then(confirmed => { if (confirmed) close(); }); }}>Consultar resultado</button></div>;
  return kind ? <RelationPicker key={kind} target={target} kind={kind} onLink={mutation.link} busy={mutation.busy} error={mutation.error} close={close} /> : <div className="grid">
    {(Object.keys(labels) as RelationKind[]).map((mode) => <button type="button" key={mode} disabled={Boolean(task.parent_id) && mode !== "custom"} className={`${button} disabled:cursor-default disabled:opacity-50`} onClick={() => setKind(mode)}>{labels[mode]}</button>)}
    {task.parent_id && <p className="m-0 px-3 py-2 text-xs text-neutral-600">Las dependencias solo están disponibles entre tareas principales. Las relaciones informativas sí admiten subtareas.</p>}
  </div>;
}

export default function TaskRelations({ target, task, page, loading, error, retry, moreBusy, loadMore, onChanged, onNavigate, focusOnOpen = false }: {
  focusOnOpen?: boolean;
  target: TaskIdentity; task: Task; page: TaskPage<TaskRelation> | null; loading: boolean; error: string; retry: () => void;
  moreBusy: boolean; loadMore: () => Promise<void>; onChanged: (otherId: number) => Promise<void>; onNavigate: (target: TaskIdentity) => void;
}) {
  const section = useRef<HTMLElement>(null), focused = useRef(false);
  useEffect(() => {
    if (focusOnOpen && !loading && !focused.current) {
      focused.current = true;
      section.current?.scrollIntoView({ block: "nearest" });
      section.current?.focus({ preventScroll: true });
    }
  }, [focusOnOpen, loading]);
  const [removing, setRemoving] = useState<string | null>(null);
  const mutation = useRelationMutation(target, onChanged);
  const id = useId();
  return <section ref={section} tabIndex={focusOnOpen ? -1 : undefined} aria-label="Relaciones" className="mt-6 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2">
    <TaskProperty appearance="detail" id={id} cell icon={RelationIcon} label="Relacionar elementos o añadir dependencias" value="" disabled={!task.permissions.relations}
      content={<span className="flex min-w-0 max-w-full! items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-800"><RelationIcon className="size-4" /><span className="truncate">Relacionar elementos o añadir dependencias</span></span>}>
      {(close) => <RelationChooser target={target} task={task} mutation={mutation} close={close} />}
    </TaskProperty>
    {loading && <p role="status" className="text-xs text-neutral-600">Cargando relaciones…</p>}
    {mutation.uncertain && <p role="status" className="text-xs">Resultado sin confirmar; no se repetirá el envío. <button type="button" className={button} disabled={mutation.busy} onClick={() => { void mutation.consult().then(confirmed => { if (confirmed) setRemoving(null); }); }}>Consultar resultado</button></p>}
    {(error || mutation.error) && <p role="alert" className="text-xs text-red-700">{error || mutation.error} <button type="button" className="cursor-pointer underline" onClick={retry}>Reintentar</button></p>}
    <ul className="m-0 list-none p-0">{page?.items.map((relation) => <li key={relation.id} className="flex min-w-0 flex-wrap items-center gap-2 border-b border-neutral-200 py-2 text-xs">
      <span className="text-neutral-600">{relation.kind === "custom" ? relation.name : relation.kind === "blocks" ? "Bloquea" : "Está bloqueada por"}</span>
      <button type="button" className="min-w-0 flex-1 cursor-pointer break-words rounded-lg px-1 py-1 text-left text-neutral-800 hover:underline" onClick={() => onNavigate({ projectId: target.projectId, taskId: relation.target_id })}>{relation.target_name}</button>
      {task.permissions.relations && (removing === relation.id ? <><button type="button" disabled={mutation.busy || mutation.uncertain} className={`${button} text-red-700`} onClick={() => { void mutation.unlink(relation).then((saved) => { if (saved) setRemoving(null); }); }}>Confirmar desvinculación</button><button type="button" disabled={mutation.busy} className={button} onClick={() => setRemoving(null)}>Cancelar</button></>
        : <button type="button" className={button} onClick={() => setRemoving(relation.id)}>Desvincular</button>)}
    </li>)}</ul>
    {page?.next_cursor != null && <button type="button" className={button} disabled={moreBusy} onClick={() => { void loadMore(); }}>Más relaciones</button>}
  </section>;
}
