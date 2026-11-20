import { createContext } from "react";
interface GanttActions {
  openTask: (id: number) => void;
  toggleBranch: (id: number, expanded: boolean) => void;
  filtered: boolean;
  createChild: (id: number) => void;
  canCreateChild: (id: number) => boolean;
  rename: (id: number) => void;
  canRename: (id: number) => boolean;
  createRoot: () => void;
}
export const TaskActions = createContext<GanttActions>({
  rename() {},
  canRename() {
    return false;
  },
  createRoot() {},
  openTask() {},
  toggleBranch() {},
  filtered: false,
  createChild() {},
  canCreateChild() {
    return false;
  },
});
