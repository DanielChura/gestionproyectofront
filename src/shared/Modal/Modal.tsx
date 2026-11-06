import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  taskComposer?: boolean;
  projectComposer?: boolean;
  statusComposer?: boolean;
  taskDetail?: boolean;
  children: ReactNode;
}

export default function Modal({
  title,
  onClose,
  busy = false,
  wide = false,
  taskComposer = false,
  projectComposer = false,
  statusComposer = false,
  taskDetail = false,
  children,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    element.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, []);

  let sizeClasses = "max-w-2xl";
  if (wide) sizeClasses = "max-w-3xl";
  if (taskComposer || projectComposer)
    sizeClasses = "max-w-3xl overflow-hidden open:flex open:flex-col";
  if (statusComposer)
    sizeClasses =
      "max-w-3xl h-dvh max-h-[48rem] overflow-hidden rounded-xl open:flex open:flex-col";
  if (taskDetail)
    sizeClasses =
      "max-w-screen-2xl h-dvh max-h-dvh overflow-hidden rounded-xl open:flex open:flex-col";

  return (
    <dialog
      ref={dialog}
      className={`m-auto max-h-dvh w-11/12 overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white p-0 text-neutral-800 backdrop:bg-neutral-900/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 ${sizeClasses}`}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (
          (taskComposer || projectComposer || statusComposer || taskDetail) &&
          event.key === "Tab" &&
          event.target instanceof HTMLElement &&
          event.target.closest("dialog") === event.currentTarget
        ) {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button, input, textarea, select, a[href], summary, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter(
            (element) =>
              !element.matches(":disabled") &&
              element.getClientRects().length > 0 &&
              element.closest("dialog") === event.currentTarget,
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          event.currentTarget.parentElement?.closest("dialog[open]") &&
          event.target instanceof HTMLElement &&
          event.target.closest("dialog") === event.currentTarget
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
      }}
    >
      {taskDetail ? (
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
      ) : (
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <h2
            id={titleId}
            className="m-0 break-words text-sm font-semibold text-neutral-800 dark:text-neutral-100"
          >
            {title}
          </h2>
          <button
            className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700 hover:bg-neutral-200 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            type="button"
            aria-label="Cerrar modal"
            disabled={busy}
            onClick={onClose}
          >
            ✕
          </button>
        </header>
      )}
      {children}
    </dialog>
  );
}
