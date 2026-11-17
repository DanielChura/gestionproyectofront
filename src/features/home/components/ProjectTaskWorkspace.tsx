import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { sessionVersion } from "../../../core/api/httpClient";
import { createTaskSync, TaskSyncContext } from "../utils/useTaskSync";

export default function ProjectTaskWorkspace({
  projectId,
  children,
}: {
  projectId: number;
  children: ReactNode;
}) {
  const epoch = sessionVersion();
  const sync = useMemo(
    () => createTaskSync(projectId, epoch),
    [projectId, epoch],
  );
  useEffect(() => {
    sync.activate();
    return () => sync.dispose();
  }, [sync]);
  return (
    <TaskSyncContext.Provider value={sync}>{children}</TaskSyncContext.Provider>
  );
}
