import type { FormEvent, ReactNode } from "react";
import XIcon from "../../icons/XIcon";
import Button from "../Button/Button";

interface FormProps {
  title: string;
  submitLabel: string;
  size?: "sm" | "md" | "lg";
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

const SIZE_CLASS: Record<NonNullable<FormProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

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
      <form
        className={`w-full ${SIZE_CLASS[size]} max-h-[90vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100`}
        onSubmit={onSubmit}
        noValidate
        autoComplete="off"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <h3 className="m-0 text-sm font-medium">{title}</h3>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <div className="grid grid-cols-2 gap-4 px-5 py-4">{children}</div>
        <footer className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-100 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-950/50">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : submitLabel}
          </Button>
        </footer>
      </form>
    </div>
  );
}
