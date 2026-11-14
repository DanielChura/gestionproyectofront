import { useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import type { Task } from "../types";
import { taskAssignees } from "../utils/taskAssignees";

export function useMyTasksFilter(tasks: Task[]) {
  const { user } = useAuth();
  const [mine, setMine] = useState(false);

  const visible = useMemo(
    () =>
      mine && user
        ? tasks.filter((task) =>
            taskAssignees(task).some((person) => person.id === user.id),
          )
        : tasks,
    [tasks, mine, user],
  );

  return {
    user,
    mine,
    tasks: visible,
    toggleMine: () => setMine((value) => !value),
  };
}
