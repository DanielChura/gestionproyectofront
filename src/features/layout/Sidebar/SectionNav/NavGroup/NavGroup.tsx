import type { ReactNode } from "react";

interface NavGroupProps {
  title: string;
  children: ReactNode;
}

export default function NavGroup({ title, children }: NavGroupProps) {
  return (
    <div className="my-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
      <p className="m-0 mb-2 ml-1.5 text-xs text-neutral-500 dark:text-neutral-300">
        {title}
      </p>
      {children}
    </div>
  );
}
