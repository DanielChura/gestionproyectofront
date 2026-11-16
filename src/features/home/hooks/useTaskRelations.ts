import { useCallback, useEffect, useRef, useState } from "react";
import type { RelationKind, TaskIdentity, TaskRelation } from "../types";
import {
  changeDependency,
  convertDependency,
  createTaskRelation,
  removeTaskRelation,
  searchRelatedTasks,
} from "../services";
import { calendarProblem } from "../utils/useTaskCalendarEdit";
import { errorText } from "../../auth/api";
import { useTaskSync } from "../utils/useTaskSync";
import { useTaskPage } from "./useTaskDetail";

export function useRelationMutation(
  target: TaskIdentity,
  onChanged: (otherId: number) => Promise<void>,
) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const sync = useTaskSync();
  const pending = useRef(false),
    alive = useRef(false),
    ambiguous = useRef(false);
  const pendingTarget = useRef<number | null>(null);
  const undoReceipt = useRef<
    import("../types").DependencyUndoReceipt | undefined
  >(undefined);
  const [uncertain, setUncertain] = useState(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function mutate(action: () => Promise<unknown>, otherId: number) {
    if (
      pending.current ||
      ambiguous.current ||
      !alive.current ||
      !sync.isCurrent()
    )
      return false;
    const ticket = sync.token();
    const valid = () =>
      alive.current && sync.isCurrent() && sync.token() === ticket;
    pending.current = true;
    pendingTarget.current = otherId;
    setBusy(true);
    setError("");
    try {
      await action();
      if (!valid()) return false;
      await onChanged(otherId);
      return alive.current && sync.isCurrent();
    } catch (failure) {
      if (valid()) {
        if (calendarProblem(failure) === "ambiguous") {
          ambiguous.current = true;
          setUncertain(true);
        }
        setError(errorText(failure));
      }
      return false;
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function link(
    kind: RelationKind,
    otherId: number,
    name: string,
    type?: import("../types").DependencyType,
  ) {
    if (kind !== "custom" && !type) {
      setError("Selecciona un tipo explícito de dependencia.");
      return Promise.resolve(false);
    }
    return mutate(
      () =>
        kind === "custom"
          ? createTaskRelation(target, otherId, name.trim())
          : kind === "blocks"
            ? changeDependency(
                target.projectId,
                otherId,
                target.taskId,
                false,
                type,
              )
            : changeDependency(
                target.projectId,
                target.taskId,
                otherId,
                false,
                type,
              ),
      otherId,
    );
  }

  function unlink(relation: TaskRelation) {
    undoReceipt.current = undefined;
    return mutate(async () => {
      if (relation.kind === "custom") {
        await removeTaskRelation(target, relation.relation_id!);
      } else {
        undoReceipt.current = await changeDependency(
          target.projectId,
          relation.successor_id!,
          relation.predecessor_id!,
          true,
        );
      }
    }, relation.target_id);
  }

  function restore(otherId: number, token: string) {
    return mutate(
      () =>
        changeDependency(
          target.projectId,
          otherId,
          target.taskId,
          false,
          undefined,
          token,
        ),
      otherId,
    );
  }

  async function consult() {
    if (
      pending.current ||
      pendingTarget.current === null ||
      !alive.current ||
      !sync.isCurrent()
    )
      return false;
    const ticket = sync.token();
    pending.current = true;
    setBusy(true);
    try {
      await onChanged(pendingTarget.current);
      if (!alive.current || !sync.isCurrent() || sync.token() !== ticket)
        return false;
      ambiguous.current = false;
      setUncertain(false);
      setError("");
      return true;
    } catch (failure) {
      if (alive.current && sync.isCurrent() && sync.token() === ticket)
        setError(errorText(failure));
      return false;
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function convert(
    relation: TaskRelation,
    type: import("../types").DependencyType,
  ) {
    return mutate(
      () =>
        convertDependency(
          target.projectId,
          relation.successor_id!,
          relation.predecessor_id!,
          type,
          relation.dependency_type ?? null,
        ),
      relation.target_id,
    );
  }
  return {
    link,
    unlink,
    restore,
    undoReceipt,
    convert,
    busy,
    error,
    uncertain,
    consult,
  };
}

export function useRelationPicker(target: TaskIdentity, kind: RelationKind) {
  const [query, setQuery] = useState(""),
    [term, setTerm] = useState(""),
    [name, setName] = useState(""),
    [dependencyType, setDependencyType] = useState<
      import("../types").DependencyType | ""
    >("");
  const { projectId, taskId } = target;

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useTaskPage(
    useCallback(
      (cursor: number) =>
        searchRelatedTasks({ projectId, taskId }, kind, term, cursor),
      [projectId, taskId, kind, term],
    ),
  );

  return {
    query,
    setQuery,
    name,
    setName,
    dependencyType,
    setDependencyType,
    results,
    searching: query.trim() !== term || results.loading,
  };
}
