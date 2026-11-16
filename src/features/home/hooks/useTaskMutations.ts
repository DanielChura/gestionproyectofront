import { useCallback, useState } from "react";
import type {
  CreateTaskPayload,
  EditTaskPayload,
  Task,
  TaskFormPayload,
  TaskStatePayload,
} from "../../../core/interfaces/task.interface";
import {
  getTaskDetail as apiGetTaskDetail,
  changeDependency as apiChangeDependency,
  changeTaskState as apiChangeTaskState,
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
  updateTask as apiUpdateTask,
} from "../../../core/services/taskService";
import { errorText } from "../../auth/api";
import { useTaskSync } from "../utils/useTaskSync";
import { useToast } from "../../../hooks/useToast";

interface UseTaskMutationsOptions {
  projectId: number;
  onTaskSaved: (task: Task) => void;
  onTasksReplaced?: (tasks: Task[]) => void;
}

export function useTaskMutations({
  projectId,
  onTaskSaved,
  onTasksReplaced,
}: UseTaskMutationsOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();
  const sync = useTaskSync();

  const saveTask = useCallback(
    async (
      data: TaskFormPayload,
      actionKind: "create" | "edit" | "child",
      taskId?: number,
    ) => {
      setBusy(true);
      setError("");
      try {
        let saved: Task;
        if (actionKind === "edit" && taskId && !("state_code" in data)) {
          saved = await apiUpdateTask(projectId, taskId, data);
        } else if (
          (actionKind === "create" || actionKind === "child") &&
          "state_code" in data
        ) {
          saved = await apiCreateTask(projectId, data as CreateTaskPayload);
        } else {
          throw new Error("Acción no disponible.");
        }
        onTaskSaved(saved);
        addToast({
          icon: "success",
          title: "Guardado",
          message: saved.name,
        });
        return saved;
      } catch (err) {
        const message = errorText(err);
        setError(message);
        addToast({
          icon: "error",
          title: "Error al guardar tarea",
          message,
        });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [projectId, onTaskSaved, addToast],
  );

  const changeState = useCallback(
    async (task: Task, payload: TaskStatePayload) => {
      setBusy(true);
      setError("");
      try {
        const updated = await apiChangeTaskState(projectId, task.id, payload);
        onTaskSaved(updated);
        addToast({
          icon: "success",
          title: "Estado actualizado",
          message: `${task.name} → ${updated.state_name}`,
        });
        return updated;
      } catch (err) {
        const message = errorText(err);
        setError(message);
        addToast({
          icon: "error",
          title: "Error al cambiar estado",
          message,
        });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [projectId, onTaskSaved, addToast],
  );

  const patchTask = useCallback(
    async (task: Task, data: Partial<EditTaskPayload>) => {
      setBusy(true);
      setError("");
      try {
        const payload: Partial<EditTaskPayload> & Record<string, unknown> = { ...data };
        if (
          ("start_date" in payload || "due_date" in payload || "schedule" in payload) &&
          !payload.calendar_intent_id
        ) {
          payload.calendar_intent_id = crypto.randomUUID();
          payload.expected_calendar_revision = Number(task.calendar_revision || 1);
        }
        const updated = await apiUpdateTask(projectId, task.id, payload);
        onTaskSaved(updated);
        return updated;
      } catch (err: unknown) {
        const failure = err as { status?: number; payload?: { code?: string } };
        if (failure?.status === 409 && failure?.payload?.code === "calendar_revision_conflict") {
          try {
            const fresh = await apiGetTaskDetail({ projectId, taskId: task.id });
            if (fresh?.task) {
              onTaskSaved(fresh.task);
              const retryPayload = {
                ...data,
                expected_calendar_revision: Number(fresh.task.calendar_revision || 1),
                calendar_intent_id: crypto.randomUUID(),
              };
              const updated = await apiUpdateTask(projectId, task.id, retryPayload);
              onTaskSaved(updated);
              return updated;
            }
          } catch {
            // Fallthrough to toast
          }
        }
        const message = errorText(err);
        setError(message);
        addToast({
          icon: "error",
          title: "Error al actualizar tarea",
          message,
        });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [projectId, onTaskSaved, addToast],
  );

  const changeDependency = useCallback(
    async (taskId: number, predecessorId: number, remove: boolean, type?: import("../types").DependencyType) => {
      setBusy(true);
      setError("");
      try {
        const ticket = sync.token();
        sync.guard(ticket);
        await apiChangeDependency(projectId, taskId, predecessorId, remove, type);
        sync.guard(ticket);
        const detail = await sync.read(() => apiGetTaskDetail({ projectId, taskId }));
        sync.guard(ticket);
        onTaskSaved(sync.confirm(detail.task));
        addToast({
          icon: "success",
          title: "Dependencia actualizada",
          message: remove ? "Dependencia retirada" : "Dependencia agregada",
        });
      } catch (err) {
        const message = errorText(err);
        setError(message);
        addToast({
          icon: "error",
          title: "Error al actualizar dependencia",
          message,
        });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [projectId, addToast, onTaskSaved, sync],
  );

  const moveTask = useCallback(
    async (
      taskId: number,
      payload: TaskStatePayload & {
        before_id: number | null;
        expected_revision: string;
      },
    ) => {
      setBusy(true);
      setError("");
      try {
        const updatedTasks = await apiMoveTask(projectId, taskId, payload);
        onTasksReplaced?.(updatedTasks);
        return updatedTasks;
      } catch (err) {
        const message = errorText(err);
        setError(message);
        addToast({
          icon: "error",
          title: "Error al mover tarea",
          message,
        });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [projectId, onTasksReplaced, addToast],
  );

  return {
    busy,
    error,
    saveTask,
    changeState,
    patchTask,
    changeDependency,
    moveTask,
  };
}
