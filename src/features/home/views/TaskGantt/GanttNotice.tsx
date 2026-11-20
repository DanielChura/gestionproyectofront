import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export default function GanttNotice({
  children,
  label,
  onExpire,
}: {
  children: ReactNode;
  label: string;
  onExpire?: () => void;
}) {
  const [expired, setExpired] = useState(false);
  const close = useRef(onExpire);
  useEffect(() => {
    close.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setExpired(true);
      close.current?.();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);
  if (expired) return null;
  return (
    <aside
      aria-label={label}
      aria-live="polite"
      className="pointer-events-none fixed bottom-14 right-6 z-60 grid max-w-sm gap-2 rounded-md border border-neutral-300 bg-white p-3 text-xs text-neutral-800 [&_button]:pointer-events-auto dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
    >
      {children}
    </aside>
  );
}
