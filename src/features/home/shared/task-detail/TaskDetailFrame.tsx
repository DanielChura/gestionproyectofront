import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export default function TaskDetailFrame({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label="Detalle de tarea"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto h-[660px] max-h-[calc(100dvh-2rem)] w-[1140px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-neutral-200 bg-white dark:bg-neutral-900 p-0 text-neutral-800 dark:text-neutral-100 backdrop:bg-black/10 backdrop:backdrop-blur-sm dark:backdrop:bg-black/60 dark:border-neutral-800 open:flex"
    >
      <div className="flex size-full flex-col bg-white dark:bg-neutral-900">
        {children}
      </div>
    </dialog>
  );
}
