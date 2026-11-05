import { useEffect, useRef } from "react";
import type { FormEventHandler, ReactNode } from "react";
import type { FieldErrors } from "../../utils/formErrors";

interface ProjectFormProps {
  children: ReactNode;
  actions?: ReactNode;
  busy: boolean;
  error: string;
  compact?: boolean;
  fieldErrors?: FieldErrors;
  manualValidation?: boolean;
  readOnly?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function ProjectForm({
  children,
  actions,
  busy,
  error,
  compact = false,
  fieldErrors = {},
  manualValidation = false,
  readOnly = false,
  onSubmit,
}: ProjectFormProps) {
  const message = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (busy) return;
    const first = Object.keys(fieldErrors)[0];
    if (first) {
      document.getElementById(first)?.focus();
    } else if (error) {
      message.current?.focus();
    }
  }, [busy, error, fieldErrors]);

  return (
    <form
      className={`grid min-w-0 gap-3 p-5 text-neutral-800 max-sm:p-4 dark:text-neutral-100 ${compact ? "gap-4" : ""}`}
      noValidate={manualValidation}
      autoComplete="off"
      aria-busy={busy}
      onSubmit={onSubmit}
    >
      <fieldset
        className="m-0 grid min-w-0 gap-3 border-0 p-0"
        disabled={busy || readOnly}
      >
        {children}
      </fieldset>
      {error && (
        <p
          ref={message}
          className="m-0 text-xs text-red-600 dark:text-red-400"
          role="alert"
          tabIndex={-1}
        >
          {error}
        </p>
      )}
      {actions && (
        <footer className="mt-2 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          {actions}
        </footer>
      )}
    </form>
  );
}

