import type { FormEvent, ReactNode } from "react";
import XIcon from "../Icons/XIcon";
import Button from "../Button/Button";
import SecondaryButton from "../Button/SecondaryButton";

interface FormProps {
  title: string;
  submitLabel: string;
  size?: "md" | "lg";
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export default function Form({
  title,
  submitLabel,
  size = "md",
  submitting = false,
  onClose,
  onSubmit,
  children,
}: FormProps) {
  return (
    <div className="bg-modal">
      <div
        className={`w-full ${
          size === "lg" ? "max-w-2xl" : "max-w-md"
        } max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-xl`}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100">
            {title}
          </h3>
          <button
            type="button"
            className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-full cursor-pointer inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <form className="grid grid-cols-2 gap-4 p-4" onSubmit={onSubmit}>
          {children}
          <footer className="col-span-2 flex items-center justify-end gap-2 pt-1">
            <SecondaryButton type="button" onClick={onClose}>
              Cancelar
            </SecondaryButton>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : submitLabel}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
