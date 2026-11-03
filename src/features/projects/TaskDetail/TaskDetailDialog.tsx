import { lazy, Suspense } from "react";
import Modal from "../Modal/Modal";
import type { TaskDetailProps } from "./TaskDetailContent";

const Content = lazy(() => import("./TaskDetailContent"));

export default function TaskDetailDialog(props: TaskDetailProps) {
  return (
    <Suspense
      fallback={
        <Modal title="Detalle de tarea" taskDetail onClose={props.onClose}>
          <p role="status" className="px-6 py-5 text-xs text-neutral-600">
            Cargando detalle…
          </p>
          <button
            type="button"
            className="mx-6 mb-5 cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs"
            onClick={props.onClose}
          >
            Cerrar detalle
          </button>
        </Modal>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
