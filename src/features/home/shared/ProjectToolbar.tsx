import type { ReactNode } from "react";

export default function ProjectToolbar({
  children,
  action,
}: {
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 pb-4">
      {children}
      {action && (
        <div className="ml-auto flex items-center gap-2">{action}</div>
      )}
    </div>
  );
}
