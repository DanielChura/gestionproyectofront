import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTaskView } from "../../../hooks/useTaskView";
import type { Project, TaskGroupingPreferences } from "../../../types";
import { defaultTaskGroupingPreferences } from "../../../utils/taskGrouping";

export function useBoard(
  project: Project,
  onProjectChange: Dispatch<SetStateAction<Project | null>>,
  initialCreate?: number,
  onCreateHandled?: () => void,
) {
  const [search, setSearch] = useState("");
  const [preferences, setPreferences] = useState<TaskGroupingPreferences>(
    defaultTaskGroupingPreferences,
  );
  const taskView = useTaskView(
    project,
    onProjectChange,
    initialCreate,
    onCreateHandled,
  );

  return { ...taskView, search, setSearch, preferences, setPreferences };
}
