import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { bindGanttScroll } from "./ganttScroll";

export function useGanttVerticalScroll(api: IApi | null, surface: RefObject<HTMLDivElement | null>) {
  const binding = useRef<ReturnType<typeof bindGanttScroll>>(undefined);
  const [view, setView] = useState({ height: 0, maximum: 0, top: 0 });
  useEffect(() => {
    const root = surface.current?.querySelector<HTMLElement>(".gm-task-gantt");
    if (!api || !root) return;
    binding.current = bindGanttScroll(api, root, next => setView(current =>
      current.height === next.height && current.maximum === next.maximum && current.top === next.top ? current : next));
    return () => { binding.current?.dispose(); binding.current = undefined; };
  }, [api, surface]);
  return { ...view, step: (direction: number) => binding.current?.step(direction) };
}
