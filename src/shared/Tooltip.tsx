import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ label, children, portalTarget, disabled = false }: {
  label: string;
  portalTarget?: "dialog";
  disabled?: boolean;
  children: (description: string) => ReactNode;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  function show(element: HTMLElement) {
    setPortalContainer(portalTarget === "dialog" ? element.closest("dialog") : null);
    setOpen(true);
  }
  useLayoutEffect(() => {
    if (!open || disabled) return;
    function place() {
      if (!anchor.current || !tip.current) return;
      const a = anchor.current.getBoundingClientRect();
      const t = tip.current.getBoundingClientRect();
      const bounds = portalContainer?.getBoundingClientRect();
      const left = bounds ? Math.max(8, bounds.left + 8) : 8;
      const right = bounds ? Math.min(innerWidth - 8, bounds.right - 8) : innerWidth - 8;
      const top = a.top > t.height + 12 ? a.top - t.height - 6 : a.bottom + 6;
      tip.current.style.left = `${Math.max(left, Math.min(a.left, right - t.width))}px`;
      tip.current.style.top = `${bounds ? Math.max(bounds.top + 8, Math.min(top, bounds.bottom - t.height - 8)) : top}px`;
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, label, disabled, portalContainer]);
  return <span ref={anchor} className="min-w-0 inline-flex" onMouseEnter={(event) => show(event.currentTarget)}
    onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setOpen(false); }} onFocus={(event) => show(event.currentTarget)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(":hover")) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    {children(id)}
    {open && !disabled && createPortal(<span ref={tip} id={id} role="tooltip"
      className={`fixed z-100 max-w-full break-words rounded-lg border border-neutral-200 bg-neutral-800 px-2 py-1 text-xs text-white dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-900${portalTarget === "dialog" ? " pointer-events-none w-max max-w-88!" : ""}`}>{label}</span>, portalContainer ?? document.body)}
    {(!open || disabled) && <span id={id} role="tooltip" hidden>{label}</span>}
  </span>;
}
