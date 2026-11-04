import { useCallback, useEffect, useRef, useState } from "react";
import type { RelationKind, TaskIdentity, TaskRelation } from "../types";
import { changeDependency, createTaskRelation, removeTaskRelation, searchRelatedTasks } from "../services";
import { calendarProblem } from "../useTaskCalendarEdit";
import { errorText } from "../../auth/api";
import { useTaskSync } from "../useTaskSync";
import { useTaskPage } from "./useTaskDetail";

export function useRelationMutation(target: TaskIdentity, onChanged: (otherId: number) => Promise<void>) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const sync = useTaskSync();
  const pending = useRef(false), alive = useRef(false), ambiguous = useRef(false);
  const pendingTarget = useRef<number | null>(null);
  const [uncertain, setUncertain] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function mutate(action: () => Promise<void>, otherId: number) {
    if (pending.current || ambiguous.current || !alive.current || !sync.isCurrent()) return false;
    const ticket = sync.token();
    const valid = () => alive.current && sync.isCurrent() && sync.token() === ticket;
    pending.current = true; pendingTarget.current = otherId; setBusy(true); setError("");
    try {
      await action();
      if (!valid()) return false;
      await onChanged(otherId);
      return valid();
    } catch (failure) { if (valid()) { if (calendarProblem(failure) === "ambiguous") { ambiguous.current = true; setUncertain(true); } setError(errorText(failure)); } return false; }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  function link(kind: RelationKind, otherId: number, name: string) {
    return mutate(() => kind === "custom" ? createTaskRelation(target, otherId, name.trim())
      : kind === "blocks" ? changeDependency(target.projectId, otherId, target.taskId, false)
        : changeDependency(target.projectId, target.taskId, otherId, false), otherId);
  }
  function unlink(relation: TaskRelation) {
    return mutate(() => relation.kind === "custom" ? removeTaskRelation(target, relation.relation_id!)
      : changeDependency(target.projectId, relation.successor_id!, relation.predecessor_id!, true), relation.target_id);
  }
  async function consult() {
    if (pending.current || pendingTarget.current === null || !alive.current || !sync.isCurrent()) return false;
    const ticket = sync.token();
    pending.current = true; setBusy(true);
    try {
      await onChanged(pendingTarget.current);
      if (!alive.current || !sync.isCurrent() || sync.token() !== ticket) return false;
      ambiguous.current = false; setUncertain(false); setError("");
      return true;
    } catch (failure) { if (alive.current && sync.isCurrent() && sync.token() === ticket) setError(errorText(failure)); return false; }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  return { link, unlink, busy, error, uncertain, consult };
}

export function useRelationPicker(target: TaskIdentity, kind: RelationKind) {
  const [query, setQuery] = useState(""), [term, setTerm] = useState(""), [name, setName] = useState("");
  const { projectId, taskId } = target;
  useEffect(() => { const timer = window.setTimeout(() => setTerm(query.trim()), 250); return () => window.clearTimeout(timer); }, [query]);
  const results = useTaskPage(useCallback((cursor: number) => searchRelatedTasks({ projectId, taskId }, kind, term, cursor), [projectId, taskId, kind, term]));
  return { query, setQuery, name, setName, results, searching: query.trim() !== term || results.loading };
}
