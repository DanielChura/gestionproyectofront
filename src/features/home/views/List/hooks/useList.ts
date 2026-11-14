import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTaskView } from "../../../hooks/useTaskView";
import type {
  Project,
  TaskGroupControls,
  TaskGroupingPreferences,
} from "../../../types";
import { defaultTaskGroupingPreferences } from "../../../utils/taskGrouping";

export function useList(
  project: Project,
  onProjectChange: Dispatch<SetStateAction<Project | null>>,
  initialCreate?: number,
  onCreateHandled?: () => void,
  initialTaskId?: number,
) {
  const [search, setSearch] = useState("");
  const [preferences, setPreferences] = useState<TaskGroupingPreferences>(
    defaultTaskGroupingPreferences,
  );
  const [groupControls, setGroupControls] = useState<TaskGroupControls | null>(
    null,
  );
  const taskView = useTaskView(
    project,
    onProjectChange,
    initialCreate,
    onCreateHandled,
    initialTaskId,
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
