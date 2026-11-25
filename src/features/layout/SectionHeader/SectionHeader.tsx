import type { ReactNode } from "react";

export default function SectionHeader({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="-mx-4 -mt-4 mb-3 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex min-w-0 items-center justify-between gap-4 px-4 py-2.5">
        <div className="min-w-0 text-sm text-neutral-700 dark:text-neutral-100 font-medium">
          {title}
        </div>
        {action}
      </div>
      {children && <div className="flex gap-2 px-4">{children}</div>}
    </header>
  );
}
