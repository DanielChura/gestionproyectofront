import type { SelectHTMLAttributes } from "react";
import ChevronDownIcon from "../icons/ChevronIcon";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export default function Select({
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-3 pr-8 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 focus:border-neutral-400 focus:outline-none cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-600 dark:text-neutral-400" />
    </div>
  );
}
