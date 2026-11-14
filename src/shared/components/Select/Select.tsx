import type { SelectHTMLAttributes } from "react";
import ChevronDownIcon from "../../icons/ChevronIcon";

type SelectStyle = "normal" | "small";

interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "style"
> {
  className?: string;
  style?: SelectStyle;
}

export default function Select({
  className = "",
  style = "normal",
  children,
  ...props
}: SelectProps) {
  const small = style === "small";

  return (
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-200 focus:border-neutral-400 focus:outline-none cursor-pointer ${
          small ? "pl-2.5 pr-7 py-1 text-xs" : "pl-3 pr-8 py-1.5 text-sm"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-200 ${
          small ? "size-3.5" : "size-4"
        }`}
      />
    </div>
  );
}
