import type { SelectHTMLAttributes } from "react";
import ChevronDownIcon from "../../icons/ChevronIcon";

export default function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`w-full cursor-pointer appearance-none rounded-md border border-neutral-200 px-2 py-1.5 pr-7 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
    </div>
  );
}
