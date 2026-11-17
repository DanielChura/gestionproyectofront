import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import Input from "../../../shared/components/Input/Input";

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "style"> {
  label: string;
  hint?: string;
}

export default function AuthField({
  label,
  hint,
  ...props
}: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="grid gap-1.5">
      <label
        className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
        htmlFor={id}
      >
        {label}
      </label>
      <Input
        id={id}
        aria-describedby={hint ? hintId : undefined}
        {...props}
      />
      {hint && (
        <p
          className="m-0 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400"
          id={hintId}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
