import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function usePopup() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const button = trigger.current;
    const node = panel.current;
    if (!open || !button || !node) return;

    function place() {
      if (!button || !node) return;
      const box = button.getBoundingClientRect();
      const width = window.innerWidth;
      const height = window.innerHeight;
      node.style.maxHeight = `${Math.max(120, height - 16)}px`;
      const panelHeight = node.offsetHeight;
      const left = Math.min(
        Math.max(8, box.left),
        width - node.offsetWidth - 8,
      );
      const below = height - box.bottom - 8;
      const above = box.top - 8;
      const down = below >= Math.min(panelHeight, 300) || below >= above;
      node.style.left = `${Math.max(8, left)}px`;
      node.style.top = `${Math.max(
        8,
        Math.min(
          down ? box.bottom + 4 : box.top - panelHeight - 4,
          height - panelHeight - 8,
        ),
      )}px`;
    }

    place();
    const observer = new ResizeObserver(place);
    observer.observe(node);
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !panel.current?.contains(target) &&
        !trigger.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return { open, setOpen, trigger, panel };
}
