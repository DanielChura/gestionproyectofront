import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTaskView } from "../../../hooks/useTaskView";
import type { Project } from "../../../types";

export function useTablero(
  project: Project,
  onProjectChange: Dispatch<SetStateAction<Project | null>>,
  initialCreate?: number,
  onCreateHandled?: () => void,
) {
  const [search, setSearch] = useState("");
  const taskView = useTaskView(
    project,
    onProjectChange,
    initialCreate,
    onCreateHandled,
  );

  return { ...taskView, search, setSearch };
}
