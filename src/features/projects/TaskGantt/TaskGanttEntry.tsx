import { Component, lazy, Suspense } from "react";
import type { LazyExoticComponent } from "react";
import type { TaskGanttProps } from "./types";

const load = () => import("./TaskGantt");

interface BoundaryState {
  failed: boolean;
  View: LazyExoticComponent<typeof import("./TaskGantt").default>;
}

class GanttBoundary extends Component<TaskGanttProps, BoundaryState> {
  state: BoundaryState = { failed: false, View: lazy(load) };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <div role="alert" className="p-5 text-xs text-neutral-800 dark:text-neutral-200">
      <p>No se pudo mostrar Gantt. Vuelve a cargar la vista.</p>
      <button type="button" onClick={() => {
        this.props.onRetry();
        this.setState({ failed: false, View: lazy(load) });
      }} className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-neutral-700 dark:hover:bg-neutral-800">Reintentar Gantt</button>
    </div>;
    const View = this.state.View;
    return <Suspense fallback={<div role="status" className="grid min-h-96 place-items-center text-xs text-neutral-600 dark:text-neutral-300">Cargando Gantt…</div>}>
      <View {...this.props} />
    </Suspense>;
  }
}

export default function TaskGanttEntry(props: TaskGanttProps) {
  return <section aria-label="Gantt" className="flex min-h-0 min-w-0 flex-1 flex-col">
    {props.loading && <p role="status" className="py-2 text-xs text-neutral-600 dark:text-neutral-300">Actualizando tareas…</p>}
    {props.error && <div role="alert" className="flex flex-wrap items-center gap-2 py-2 text-xs text-red-700 dark:text-red-300">
      <span>No se pudieron actualizar las tareas. {props.error}</span>
      <button type="button" onClick={props.onRetry} className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Reintentar tareas</button>
    </div>}
    {!props.tasks.length && !props.loading && !props.error && <p role="status" className="py-3 text-xs text-neutral-600 dark:text-neutral-300">Este proyecto todavía no tiene tareas.</p>}
    <GanttBoundary {...props} />
  </section>;
}
