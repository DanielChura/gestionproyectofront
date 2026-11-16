import { useEffect, useState, useSyncExternalStore } from "react";
import { createGanttNavigation } from "./ganttNavigation";
import { ganttDay } from "./ganttViewport";
import { projectToday } from "../../utils/taskGrouping";
export function useGanttNavigation() {
  const [navigation] = useState(() =>
    createGanttNavigation(ganttDay(projectToday())),
  );
  const viewport = useSyncExternalStore(
    navigation.subscribe,
    navigation.getSnapshot,
    navigation.getSnapshot,
  );
  useEffect(() => {
    navigation.activate();
    return navigation.dispose;
  }, [navigation]);
  useEffect(() => {
    navigation.flush();
  }, [navigation, viewport]);
  return { navigation, viewport };
}
