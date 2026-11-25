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
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, []);

  return (
    <div
      className="bg-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <dialog
        ref={dialog}
        aria-label="Detalle de tarea"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="m-auto flex h-[760px] max-h-[calc(100dvh-2rem)] w-[1280px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
      >
        {children}
      </dialog>
    </div>
  );
}
