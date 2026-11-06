import { createContext } from "react";
import type { GanttCalendarOperation } from "./ganttCalendarOperations";

export const GanttCalendarContext = createContext<
  ReadonlyMap<number, GanttCalendarOperation>
>(new Map());
export const GanttGestureContext = createContext<number | null>(null);
