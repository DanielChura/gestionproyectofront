import type { FormEvent, ReactNode } from "react";
import XIcon from "../../icons/XIcon";
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
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        } max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 rounded-xl`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 mb-2">
          <h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100 font-medium">
            {title}
          </h3>
          <button
            type="button"
            className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-full cursor-pointer inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <form className="grid grid-cols-2 gap-4 px-5 py-3" onSubmit={onSubmit}>
          {children}
          <footer className="col-span-2 -mx-5 mt-3 flex items-center justify-end gap-2 border-t border-neutral-200 px-5 pt-3 dark:border-neutral-800">
            <SecondaryButton
              type="button"
              className="text-sm!"
              onClick={onClose}
            >
              Cancelar
            </SecondaryButton>
            <Button type="submit" className="text-sm!" disabled={submitting}>
              {submitting ? "Guardando…" : submitLabel}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
