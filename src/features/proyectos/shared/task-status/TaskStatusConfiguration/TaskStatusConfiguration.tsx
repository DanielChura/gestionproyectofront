import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";
import Modal from "../../../../../shared/Modal/Modal";

const ConfigurationDialog = lazy(
  () => import("./TaskStatusConfigurationDialog"),
);

export default function TaskStatusConfiguration(
  props: ComponentProps<typeof ConfigurationDialog>,
) {
  return (
    <Suspense
      fallback={
        <Modal
          title="Modifica los estados de Tareas"
          onClose={props.onClose}
          statusComposer
        >
          <p role="status" className="p-5 text-xs text-neutral-500">
            Cargando gestor…
          </p>
        </Modal>
      }
    >
      <ConfigurationDialog {...props} />
    </Suspense>
  );
}

