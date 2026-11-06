import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import Tooltip from "../../../shared/Tooltip";

export const ganttControl =
  "gm-gantt-control cursor-pointer touch-manipulation whitespace-nowrap rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-default disabled:opacity-50 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:outline-sky-300";

export function GanttIconButton({
  label,
  children,
  ref,
  className = "",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Tooltip label={label}>
      {(description) => (
        <button
          {...props}
          ref={ref}
          type="button"
          aria-label={label}
          aria-describedby={description}
          className={
            ganttControl +
            " inline-flex items-center justify-center !p-1.5 " +
            className
          }
        >
          <span aria-hidden="true">{children}</span>
        </button>
      )}
    </Tooltip>
  );
}
