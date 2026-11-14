import type { ReactNode } from "react";

interface MenuGroupProps {
  title: string;
  children: ReactNode;
}

export default function MenuGroup({ title, children }: MenuGroupProps) {
  return (
    <div className="my-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
      <p className="m-0 mb-2 ml-1.5 text-xs text-neutral-500 font-medium dark:text-neutral-300">
        {title}
      </p>
      {children}
    </div>
  );
}
