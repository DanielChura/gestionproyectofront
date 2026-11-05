import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTaskView } from "../../../hooks/useTaskView";
import type {
  Project,
  TaskGroupControls,
  TaskGroupingPreferences,
} from "../../../types";

export function useLista(
  project: Project,
  onProjectChange: Dispatch<SetStateAction<Project | null>>,
  initialCreate?: number,
  onCreateHandled?: () => void,
) {
  const [search, setSearch] = useState("");
  const [preferences, setPreferences] = useState<TaskGroupingPreferences>({
    mode: "state",
    order: "asc",
    separatePeople: false,
    separateLabels: false,
  });
  const [groupControls, setGroupControls] = useState<TaskGroupControls | null>(
    null,
  );
  const taskView = useTaskView(
    project,
    onProjectChange,
    initialCreate,
    onCreateHandled,
  );

  return {
    ...taskView,
    search,
    setSearch,
    preferences,
    setPreferences,
    groupControls,
    setGroupControls,
  };
}
